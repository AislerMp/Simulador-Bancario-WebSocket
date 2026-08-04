import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import {
  getUserByCorreo,
  updatePassword,
} from "../repositories/authRepositorie.js";
import {
  createPasswordResetCode,
  getValidPasswordResetCode,
  invalidatePendingResetCodes,
  markPasswordResetAsUsed,
  registerInvalidPasswordResetAttempt,
} from "../repositories/passwordResetRepositorie.js";
import { invalidatePendingCodesByUserId } from "../repositories/mfaRepositorie.js";
import { sendPasswordResetCodeEmail } from "./emailService.js";
import { createNewError } from "../utils/helpers.js";
import { registrarEvento, BITACORA_ACCIONES } from "./bitacoraService.js";

const RESET_EXPIRATION_MINUTES = 10;
const MAX_RESET_ATTEMPTS = 5;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export async function requestPasswordReset(correo) {
  const normalizedEmail = normalizeEmail(correo);

  if (!normalizedEmail) {
    throw createNewError("El correo es obligatorio", "CORREO_REQUERIDO");
  }

  const user = await getUserByCorreo(normalizedEmail);

  // Respuesta deliberadamente genérica para no revelar si un correo existe.
  if (!user || !user.activo) {
    return { accepted: true };
  }

  await invalidatePendingResetCodes(user.id_usuario);

  const codigo = randomInt(100000, 1000000).toString();
  const codigoHash = await bcrypt.hash(codigo, 10);
  const fechaExpiracion = new Date(
    Date.now() + RESET_EXPIRATION_MINUTES * 60 * 1000,
  );

  const challenge = await createPasswordResetCode({
    idUsuario: user.id_usuario,
    codigoHash,
    fechaExpiracion,
  });

  try {
    await sendPasswordResetCodeEmail({
      correo: user.correo,
      nombre: user.nombre,
      codigo,
      expirationMinutes: RESET_EXPIRATION_MINUTES,
    });
  } catch (error) {
    await markPasswordResetAsUsed(challenge.id_password_reset);
    throw error;
  }

  await registrarEvento({
    idUsuario: user.id_usuario,
    accion: BITACORA_ACCIONES.RECUPERACION_PASSWORD,
    descripcion: "Se solicitó un código de recuperación de contraseña.",
  });

  return { accepted: true };
}

export async function resetPassword({ correo, codigo, nuevaPassword }) {
  const normalizedEmail = normalizeEmail(correo);
  const normalizedCode = String(codigo || "").trim();
  const password = String(nuevaPassword || "");

  if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
    throw createNewError(
      "El correo o el código de recuperación no son válidos",
      "DATOS_RECUPERACION_INVALIDOS",
    );
  }

  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw createNewError(
      "La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
      "PASSWORD_DEBIL",
    );
  }

  const user = await getUserByCorreo(normalizedEmail);
  if (!user) {
    throw createNewError(
      "El código de recuperación no es válido o ya expiró",
      "CODIGO_RECUPERACION_INVALIDO",
    );
  }

  const challenge = await getValidPasswordResetCode(user.id_usuario);
  if (!challenge) {
    throw createNewError(
      "El código de recuperación no es válido o ya expiró",
      "CODIGO_RECUPERACION_INVALIDO",
    );
  }

  const isValid = await bcrypt.compare(normalizedCode, challenge.codigo_hash);

  if (!isValid) {
    const failure = await registerInvalidPasswordResetAttempt(
      challenge.id_password_reset,
      MAX_RESET_ATTEMPTS,
    );

    if (failure?.utilizado) {
      throw createNewError(
        "El código fue invalidado por demasiados intentos fallidos",
        "CODIGO_RECUPERACION_BLOQUEADO",
      );
    }

    throw createNewError(
      "El código de recuperación no es válido",
      "CODIGO_RECUPERACION_INVALIDO",
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await updatePassword(user.id_usuario, passwordHash);

  if (!updated) {
    throw createNewError(
      "No fue posible actualizar la contraseña",
      "ERROR_ACTUALIZAR_PASSWORD",
    );
  }

  await markPasswordResetAsUsed(challenge.id_password_reset);
  await invalidatePendingCodesByUserId(user.id_usuario);

  await registrarEvento({
    idUsuario: user.id_usuario,
    accion: BITACORA_ACCIONES.CAMBIO_PASSWORD,
    descripcion: "La contraseña fue restablecida correctamente.",
  });

  return { updated: true };
}
