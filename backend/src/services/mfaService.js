import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import env from "dotenv";
import {
  createCodigoMfaCode,
  getValidMfaChallenge,
  markMfaCodeAsUsed,
  invalidatePendingCodesByUserId,
  registerInvalidMfaAttempt,
} from "../repositories/mfaRepositorie.js";
import { getUserById } from "../repositories/authRepositorie.js";
import { sendMfaCodeEmail } from "./emailService.js";
import { createNewError } from "../utils/helpers.js";
import { registrarEvento, BITACORA_ACCIONES } from "./bitacoraService.js";

env.config();

const MFA_EXPIRATION_MINUTES = 5;
const MAX_MFA_ATTEMPTS = 5;

export async function generarCodigoMfa(idUsuario) {
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    throw createNewError(
      "El usuario indicado no es válido",
      "USUARIO_INVALIDO",
    );
  }

  const user = await getUserById(idUsuario);
  if (!user) {
    throw createNewError("No se encontró el usuario", "USUARIO_INVALIDO");
  }

  const codigo = randomInt(100000, 1000000).toString();

  console.log(`Código MFA generado para el usuario ${idUsuario}: ${codigo}`);
  
  const codigoMfahash = await bcrypt.hash(codigo, 10);
  const fechaExpiracion = new Date(
    Date.now() + MFA_EXPIRATION_MINUTES * 60 * 1000,
  );

  await invalidatePendingCodesByUserId(idUsuario);

  const challenge = await createCodigoMfaCode({
    idUsuario,
    codigoMfahash,
    fechaExpiracion,
  });

  if (!challenge) {
    throw createNewError(
      "No se pudo generar el código MFA",
      "GENERACION_CODIGO_FALLIDA",
    );
  }

  try {
    await sendMfaCodeEmail({
      correo: user.correo,
      nombre: user.nombre,
      codigo,
      expirationMinutes: MFA_EXPIRATION_MINUTES,
    });
  } catch (error) {
    await markMfaCodeAsUsed(challenge.id_codigo_mfa);
    throw createNewError(
      "No se pudo enviar el código MFA por correo electrónico",
      "ENVIO_CORREO_FALLIDO",
    );
  }

  return challenge;
}

export async function validateMfaChallenge(idUsuario, codigoMfa) {
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    throw createNewError(
      "El usuario indicado no es válido",
      "USUARIO_INVALIDO",
    );
  }

  const codigoNormalizado = String(codigoMfa ?? "").trim();

  if (!/^\d{6}$/.test(codigoNormalizado)) {
    throw createNewError(
      "El código MFA proporcionado no es válido",
      "CODIGO_MFA_INVALIDO",
    );
  }

  const challenge = await getValidMfaChallenge(idUsuario);

  if (!challenge) {
    throw createNewError(
      "No hay un desafío MFA válido para este usuario",
      "DESAFIO_MFA_NO_ENCONTRADO",
    );
  }

  const codigoValido = await bcrypt.compare(
    codigoNormalizado,
    challenge.codigo_hash,
  );

  if (!codigoValido) {
    const failure = await registerInvalidMfaAttempt(
      challenge.id_codigo_mfa,
      MAX_MFA_ATTEMPTS,
    );

    if (failure?.utilizado) {
      throw createNewError(
        "El código MFA fue invalidado por demasiados intentos fallidos",
        "CODIGO_MFA_BLOQUEADO",
      );
    }

    throw createNewError(
      "El código MFA proporcionado no es válido",
      "CODIGO_MFA_INVALIDO",
    );
  }

  const marked = await markMfaCodeAsUsed(challenge.id_codigo_mfa);
  if (!marked) {
    throw createNewError(
      "El código MFA ya fue utilizado o expiró",
      "MARCAR_CODIGO_FALLIDO",
    );
  }

  const user = await getUserById(idUsuario);
  if (!user || !user.activo) {
    throw createNewError("No se encontró el usuario", "USUARIO_INVALIDO");
  }

  const safeUser = {
    idUsuario: user.id_usuario,
    rol: user.rol,
    nombre: user.nombre,
    correo: user.correo,
    activo: user.activo,
  };

  const token = jwt.sign(
    {
      idUsuario: safeUser.idUsuario,
      rol: safeUser.rol,
      nombre: safeUser.nombre,
      correo: safeUser.correo,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  await registrarEvento({
    idUsuario,
    accion: BITACORA_ACCIONES.MFA,
    descripcion: "Código MFA verificado correctamente.",
  });

  return { user: safeUser, token };
}
