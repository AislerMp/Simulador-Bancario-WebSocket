import sgMail from "@sendgrid/mail";
import { createNewError } from "../utils/helpers.js";
import env from "dotenv";
env.config();


const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;
const fromName = process.env.SENDGRID_FROM_NAME || "Simulador Bancario";

if (!apiKey) {
  throw new Error("Falta configurar SENDGRID_API_KEY");
}

if (!fromEmail) {
  throw new Error("Falta configurar SENDGRID_FROM_EMAIL");
}

sgMail.setApiKey(apiKey);

export async function sendMfaCodeEmail({
  correo,
  nombre,
  codigo,
  expirationMinutes = 5,
}) {
  if (!correo || !codigo) {
    throw createNewError(
      "El correo y el código MFA son obligatorios",
      "DATOS_EMAIL_INCOMPLETOS",
    );
  }

  const message = {
    to: correo,

    from: {
      email: fromEmail,
      name: fromName,
    },

    subject: "Código de verificación - Simulador Bancario",

    text: `
Hola ${nombre || "usuario"}.

Tu código de verificación es: ${codigo}

El código vencerá en ${expirationMinutes} minutos.

No compartas este código con ninguna persona.
Si no intentaste iniciar sesión, puedes ignorar este mensaje.
    `.trim(),

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px;">
        <h2>Verificación de inicio de sesión</h2>

        <p>Hola <strong>${nombre || "usuario"}</strong>.</p>

        <p>Tu código de verificación es:</p>

        <div style="
          padding: 18px;
          margin: 20px 0;
          background: #f2f2f2;
          border-radius: 8px;
          text-align: center;
          font-size: 30px;
          font-weight: bold;
          letter-spacing: 8px;
        ">
          ${codigo}
        </div>

        <p>
          Este código vencerá en
          <strong>${expirationMinutes} minutos</strong>.
        </p>

        <p>No compartas este código con ninguna persona.</p>

        <p style="color: #666;">
          Si no intentaste iniciar sesión, puedes ignorar este mensaje.
        </p>
      </div>
    `,
  };

  try {
    const [response] = await sgMail.send(message);

    return {
      sent: true,
      statusCode: response.statusCode,
      messageId: response.headers?.["x-message-id"] || null,
    };
  } catch (error) {
    console.error(
      "Error de SendGrid:",
      error.response?.body || error.message,
    );

    throw createNewError(
      "No se pudo enviar el correo de verificación",
      "ENVIO_CORREO_FALLIDO",
    );
  }
}