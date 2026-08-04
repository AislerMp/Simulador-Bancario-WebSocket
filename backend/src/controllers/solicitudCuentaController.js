import {
  beginTransaction,
} from "../config/database.js";

import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/helpers.js";

import {
  solicitarCuenta,
  consultarMisSolicitudes,
  consultarSolicitudesPendientes,
  aprobarSolicitud,
  rechazarSolicitud,
} from "../services/solicitudCuentaService.js";

async function runTransaction({
  type,
  requestId,
  operation,
  successMessage,
}) {
  let transaction;

  try {
    transaction = await beginTransaction();

    const data = await operation(transaction);

    await transaction.commit();

    return createSuccessResponse({
      type,
      requestId,
      message: successMessage,
      data,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error(
          "No se pudo revertir la operación:",
          rollbackError.message,
        );
      }
    }

    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}

export function solicitarCuentaController({
  type,
  payload,
  requestId,
  userToken,
}) {
  return runTransaction({
    type,
    requestId,
    successMessage:
      "Solicitud enviada correctamente",
    operation: (transaction) =>
      solicitarCuenta(
        payload?.tipoCuenta,
        userToken,
        transaction,
      ),
  });
}

export async function getMisSolicitudesController({
  type,
  requestId,
  userToken,
}) {
  try {
    const data =
      await consultarMisSolicitudes(
        userToken,
      );

    return createSuccessResponse({
      type,
      requestId,
      message:
        "Solicitudes obtenidas correctamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}

export async function getSolicitudesPendientesController({
  type,
  requestId,
  userToken,
}) {
  try {
    const data =
      await consultarSolicitudesPendientes(
        userToken,
      );

    return createSuccessResponse({
      type,
      requestId,
      message:
        "Solicitudes pendientes obtenidas",
      data,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}

export function aprobarSolicitudController({
  type,
  payload,
  requestId,
  userToken,
}) {
  return runTransaction({
    type,
    requestId,
    successMessage:
      "Solicitud aprobada y cuenta creada",
    operation: (transaction) =>
      aprobarSolicitud(
        Number(payload?.idSolicitud),
        userToken,
        transaction,
      ),
  });
}

export function rechazarSolicitudController({
  type,
  payload,
  requestId,
  userToken,
}) {
  return runTransaction({
    type,
    requestId,
    successMessage:
      "Solicitud rechazada correctamente",
    operation: (transaction) =>
      rechazarSolicitud(
        Number(payload?.idSolicitud),
        payload?.observacion,
        userToken,
        transaction,
      ),
  });
}