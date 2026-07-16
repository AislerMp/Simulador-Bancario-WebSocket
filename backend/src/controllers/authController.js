import { login, register } from "../services/authService.js";
import { generarCodigoMfa, validateMfaChallenge, } from "../services/mfaService.js";
import { createSuccessResponse, createErrorResponse } from '../utils/reusableFunctions.js';

export async function registerController({ payload, requestId }) {
    try {
        const user = {
            nombre: payload?.nombre,
            correo: payload?.correo,
            password: payload?.password,
        } 
        const userResult = await register(user);

        return createSuccessResponse({
            type: "REGISTER_RESPONSE",
            requestId,
            message: "Usuario registrado exitosamente",
            data: userResult,
        });

    } catch (error) {
        return createErrorResponse({
            type: "REGISTER_RESPONSE",
            requestId,
            error,
        });
    }
}


export async function loginController({ payload, requestId }) {
  try {
    const challenge = await login(payload?.correo, payload?.password);
    return createSuccessResponse({
      type: "LOGIN_RESPONSE",
      requestId,
      message: "Login exitoso",
      data: challenge,
    });
  } catch (error) {
    return createErrorResponse({
      type: "LOGIN_RESPONSE",
      requestId,
      error,
    });
  }
}

export async function verifyMfaController({ payload, requestId }) {
    try {
        const result = await validateMfaChallenge( Number(payload?.idUsuario), payload?.codigoMfa);
        return createSuccessResponse({
            type: "VERIFY_MFA_RESPONSE",
            requestId,
            message: "Código MFA verificado exitosamente",
            data: result,
        });
    } catch (error) {
        return createErrorResponse({
            type: "VERIFY_MFA_RESPONSE",
            requestId,
            error,
        });
    }
}
