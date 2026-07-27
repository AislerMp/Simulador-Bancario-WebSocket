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
    const cuentaCreada = await createCuentaBancariaService(payload?.idUsuario);

    return createSuccessResponse({
      type: "CREATE_CUENTA_RESPONSE",
      requestId,
      message: "Cuenta creada satisfactoriamente",
      data: cuentaCreada,
    });
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
    const cuenta = getCuenta(payload?.idCuenta);
    return createSuccessResponse({
      type: "GET_CUENTA_RESPONSE",
      requestId,
      message: "Cuenta Obtenida",
      data: cuenta,
    });
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
    const cuentasByUsuario = await getCuentasUsuario(payload?.idUsuario);
    return createSuccessResponse({
      type: "GET_CUENTAS_BY_USUARIO_RESPONSE",
      requestId,
      message: "Cuentas Obtenidas exitosamente",
      data: cuentasByUsuario,
    });
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
    const result = await cambiarEstadoCuenta(
      payload?.idCuenta,
      payload?.estadoCuenta,
    );
    return createSuccessResponse({
      type: "CAMBIAR_ESTADO_RESPONSE",
      requestId,
      message: "Estado Actualizado exitosamente",
      data: result,
    });
  } catch (error) {
    return createErrorResponse({
      type: "LOGIN_RESPONSE",
      requestId,
      error,
    });
  }
}
