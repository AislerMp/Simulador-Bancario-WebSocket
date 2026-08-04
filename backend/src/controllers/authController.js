import {
  login,
  register,
  getUsuariosAdministrador,
} from "../services/authService.js";
import { validateMfaChallenge } from "../services/mfaService.js";
import {
  requestPasswordReset,
  resetPassword,
} from "../services/passwordResetService.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/helpers.js";

export async function getUsuariosController({ type, requestId, userToken }) {
  try {
    const usuarios = await getUsuariosAdministrador(userToken);
    return createSuccessResponse({
      type,
      requestId,
      message: "Usuarios obtenidos correctamente",
      data: usuarios,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function registerController({ type, payload, requestId }) {
  try {
    const data = await register({
      nombre: payload?.nombre,
      correo: payload?.correo,
      password: payload?.password,
    });

    return createSuccessResponse({
      type,
      requestId,
      message: "Usuario registrado exitosamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function loginController({ type, payload, requestId }) {
  try {
    const challenge = await login(payload?.correo, payload?.password);
    return createSuccessResponse({
      type,
      requestId,
      message: "Credenciales válidas. Revise el código MFA enviado al correo.",
      data: challenge,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function verifyMfaController({ type, payload, requestId }) {
  try {
    const data = await validateMfaChallenge(
      Number(payload?.idUsuario),
      payload?.codigoMfa,
    );

    return createSuccessResponse({
      type,
      requestId,
      message: "Código MFA verificado exitosamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function requestPasswordResetController({
  type,
  payload,
  requestId,
}) {
  try {
    const data = await requestPasswordReset(payload?.correo);
    return createSuccessResponse({
      type,
      requestId,
      message:
        "Si el correo está registrado, recibirá un código de recuperación.",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function resetPasswordController({ type, payload, requestId }) {
  try {
    const data = await resetPassword({
      correo: payload?.correo,
      codigo: payload?.codigo,
      nuevaPassword: payload?.nuevaPassword,
    });

    return createSuccessResponse({
      type,
      requestId,
      message: "Contraseña actualizada correctamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}
