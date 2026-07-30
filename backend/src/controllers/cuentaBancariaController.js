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

export async function createCuenta({ type, payload, requestId, userToken }) {
  try {
    const cuentaCreada = await createCuentaBancariaService(payload?.idUsuario, userToken);

    return createSuccessResponse({
      type,
      requestId,
      message: "Cuenta creada satisfactoriamente",
      data: cuentaCreada,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}

export async function getCuentaBancaria({ type, payload, requestId }) {
  try {
    const cuenta = getCuenta(payload?.idCuenta);
    return createSuccessResponse({
      type,
      requestId,
      message: "Cuenta Obtenida",
      data: cuenta,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}

export async function getCuentasBancariasUsuario({ type, payload, requestId, userToken }) {
  try {
    const cuentasByUsuario = await getCuentasUsuario(userToken?.idUsuario);
    return createSuccessResponse({
      type,
      requestId,
      message: "Cuentas Obtenidas exitosamente",
      data: cuentasByUsuario,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}

export async function changeEstadoCuenta({ type, payload, requestId, userToken }) {
  try {
    const result = await cambiarEstadoCuenta(
      payload?.idCuenta,
      payload?.idUsuario,
      payload?.estadoCuenta,
      userToken
    );
    return createSuccessResponse({
      type,
      requestId,
      message: "Estado Actualizado exitosamente",
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
