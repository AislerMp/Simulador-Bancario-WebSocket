import { login, register } from "../services/authService.js";
import {
  generarCodigoMfa,
  validateMfaChallenge,
} from "../services/mfaService.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/helpers.js";

export async function registerController({ type, payload, requestId }) {
  try {
    const user = {
      nombre: payload?.nombre,
      correo: payload?.correo,
      password: payload?.password,
    };
    const userResult = await register(user);

    return createSuccessResponse({
      type,
      requestId,
      message: "Usuario registrado exitosamente",
      data: userResult,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}

export async function loginController({ type, payload, requestId }) {
  try {
    const challenge = await login(payload?.correo, payload?.password);
    return createSuccessResponse({
      type,
      requestId,
      message: "Login exitoso",
      data: challenge,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}

export async function verifyMfaController({ type, payload, requestId }) {
  try {
    const result = await validateMfaChallenge(
      Number(payload?.idUsuario),
      payload?.codigoMfa,
    );
    return createSuccessResponse({
      type,
      requestId,
      message: "Código MFA verificado exitosamente",
      data: result,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}
