import nodemailer from "nodemailer";
import env from "dotenv";
import { createNewError } from "../utils/helpers.js";

env.config();

const emailUser = process.env.EMAIL_USER;
const emailAppPassword = process.env.EMAIL_APP_PASSWORD;
const emailFromName = process.env.EMAIL_FROM_NAME || "Simulador Bancario";

const transporter =
  emailUser && emailAppPassword
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailAppPassword,
        },
      })
    : null;

function buildCodeEmail({ nombre, codigo, expirationMinutes, purpose }) {
  const isPasswordReset = purpose === "PASSWORD_RESET";
  const subject = isPasswordReset
    ? "Recuperación de contraseña - Simulador Bancario"
    : "Código de seguridad - Simulador Bancario";
  const action = isPasswordReset
    ? "restablecer tu contraseña"
    : "completar tu inicio de sesión";

  return {
    subject,
    text:
      `Hola ${nombre || "usuario"}. ` +
      `Tu código para ${action} es ${codigo}. ` +
      `Expira en ${expirationMinutes} minutos.`,
    html: `
      <div style="max-width:520px;margin:0 auto;padding:30px;font-family:Arial,sans-serif;color:#17243b">
        <h2 style="color:#2454db">Simulador Bancario</h2>
        <p>Hola ${nombre || "usuario"},</p>
        <p>Utiliza el siguiente código para ${action}:</p>
        <div style="margin:25px 0;padding:20px;text-align:center;background:#eef3ff;border-radius:10px">
          <strong style="font-size:32px;letter-spacing:8px">${codigo}</strong>
        </div>
        <p>Este código expira en ${expirationMinutes} minutos.</p>
        <p>Si no solicitaste esta acción, ignora este correo.</p>
      </div>
    `,
  };
}

async function sendCodeEmail({
  correo,
  nombre,
  codigo,
  expirationMinutes,
  purpose,
}) {
  if (!correo || !codigo) {
    throw createNewError(
      "El correo y el código son obligatorios",
      "DATOS_EMAIL_INCOMPLETOS",
    );
  }

  if (!transporter) {
    if (process.env.MFA_DEBUG === "true") {
      console.log(`[CÓDIGO LOCAL] ${purpose} para ${correo}: ${codigo}`);
    }

    return {
      sent: false,
      local: true,
      messageId: null,
    };
  }

  try {
    const content = buildCodeEmail({
      nombre,
      codigo,
      expirationMinutes,
      purpose,
    });

    const info = await transporter.sendMail({
      from: {
        name: emailFromName,
        address: emailUser,
      },
      to: correo,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    console.log("Correo de seguridad enviado:", {
      accepted: info.accepted,
      messageId: info.messageId,
    });

    return {
      sent: true,
      local: false,
      messageId: info.messageId,
      accepted: info.accepted,
    };
  } catch (error) {
    console.error("Error al enviar el correo:", error.message);
    throw createNewError(
      "No fue posible enviar el código al correo",
      "ERROR_ENVIO_EMAIL",
    );
  }
}

export function sendMfaCodeEmail({
  correo,
  nombre,
  codigo,
  expirationMinutes = 5,
}) {
  return sendCodeEmail({
    correo,
    nombre,
    codigo,
    expirationMinutes,
    purpose: "MFA",
  });
}

export function sendPasswordResetCodeEmail({
  correo,
  nombre,
  codigo,
  expirationMinutes = 10,
}) {
  return sendCodeEmail({
    correo,
    nombre,
    codigo,
    expirationMinutes,
    purpose: "PASSWORD_RESET",
  });
}
