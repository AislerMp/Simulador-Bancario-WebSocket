import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/helpers.js";
import {
  cambiarEstadoCuenta,
  createCuentaBancariaService,
  getCuenta,
  getCuentasUsuario,
  getCuentasAdministrador,
  buscarCuentaPorNumero,
} from "../services/cuentaBancariaService.js";

export async function createCuenta({ type, payload, requestId, userToken }) {
  try {
    const data = await createCuentaBancariaService(
      Number(payload?.idUsuario),
      userToken,
    );
    return createSuccessResponse({
      type,
      requestId,
      message: "Cuenta creada satisfactoriamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function getCuentaBancaria({
  type,
  payload,
  requestId,
  userToken,
}) {
  try {
    const data = await getCuenta(Number(payload?.idCuenta), userToken);
    return createSuccessResponse({
      type,
      requestId,
      message: "Cuenta obtenida correctamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function getCuentasBancariasUsuario({
  type,
  requestId,
  userToken,
}) {
  try {
    const data = await getCuentasUsuario(userToken?.idUsuario);
    return createSuccessResponse({
      type,
      requestId,
      message: "Cuentas obtenidas exitosamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function changeEstadoCuenta({
  type,
  payload,
  requestId,
  userToken,
}) {
  try {
    const data = await cambiarEstadoCuenta(
      Number(payload?.idCuenta),
      Number(payload?.idUsuario),
      payload?.estadoCuenta,
      userToken,
    );

    return createSuccessResponse({
      type,
      requestId,
      message: "Estado actualizado exitosamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function getTodasCuentasController({
  type,
  requestId,
  userToken,
}) {
  try {
    const data = await getCuentasAdministrador(userToken);
    return createSuccessResponse({
      type,
      requestId,
      message: "Cuentas obtenidas correctamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function getCuentaPorNumeroController({
  type,
  payload,
  requestId,
}) {
  try {
    const data = await buscarCuentaPorNumero(payload?.numeroCuenta);
    return createSuccessResponse({
      type,
      requestId,
      message: "Cuenta destino encontrada",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}
