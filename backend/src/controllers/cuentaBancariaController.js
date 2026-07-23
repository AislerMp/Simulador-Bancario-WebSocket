import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/helpers.js";

import {
  cambiarEstadoCuenta,
  createCuentaBancariaService,
  getCuenta,
  getCuentasUsuario,
} from "../services/cuentaBancariaService.js";

export async function createCuenta({ payload, requestId }) {
  try {
  } catch (error) {
    return createErrorResponse({
      type: "LOGIN_RESPONSE",
      requestId,
      error,
    });
  }
}

export async function getCuentaBancaria({ payload, requestId }) {
  try {
  } catch (error) {
    return createErrorResponse({
      type: "LOGIN_RESPONSE",
      requestId,
      error,
    });
  }
}

export async function getCuentasBancariasUsuario({ payload, requestId }) {
  try {
  } catch (error) {
    return createErrorResponse({
      type: "LOGIN_RESPONSE",
      requestId,
      error,
    });
  }
}

export async function changeEstadoCuenta({ payload, requestId }) {
  try {
  } catch (error) {
    return createErrorResponse({
      type: "LOGIN_RESPONSE",
      requestId,
      error,
    });
  }
}
