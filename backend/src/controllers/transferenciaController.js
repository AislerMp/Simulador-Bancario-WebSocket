import {
  createSuccessResponse,
  createErrorResponse,
  createNewError,
} from "../utils/helpers.js";
import { beginTransaction } from "../config/database.js";
import {
  depositar,
  transferir,
  pagoServicio,
  retirarEfectivo,
  getTransaccionesByCuenta,
  revertirTransaccion,
} from "../services/transaccionService.js";

async function runTransaction({ type, requestId, operation, successMessage }) {
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
        console.error("No se pudo revertir la transacción SQL:", rollbackError.message);
      }
    }

    return createErrorResponse({ type, requestId, error });
  }
}

export function depositoEfectivoController({
  type,
  payload,
  requestId,
  userToken,
}) {
  return runTransaction({
    type,
    requestId,
    successMessage: "Depósito en efectivo realizado correctamente",
    operation: (transaction) =>
      depositar(
        {
          idCuentaDestino: Number(payload?.idCuentaDestino),
          monto: Number(payload?.monto),
        },
        userToken,
        transaction,
      ),
  });
}

export function transferenciaController({
  type,
  payload,
  requestId,
  userToken,
}) {
  return runTransaction({
    type,
    requestId,
    successMessage: "Transferencia realizada correctamente",
    operation: (transaction) =>
      transferir(
        {
          idCuentaOrigen: Number(payload?.idCuentaOrigen),
          idCuentaDestino: Number(payload?.idCuentaDestino),
          monto: Number(payload?.monto),
        },
        userToken,
        transaction,
      ),
  });
}

export function pagoServicioController({
  type,
  payload,
  requestId,
  userToken,
}) {
  return runTransaction({
    type,
    requestId,
    successMessage: "Pago de servicio realizado correctamente",
    operation: (transaction) =>
      pagoServicio(
        {
          idCuentaOrigen: Number(payload?.idCuentaOrigen),
          nombreServicio: payload?.nombreServicio,
          referenciaServicio: payload?.referenciaServicio,
          monto: Number(payload?.monto),
        },
        userToken,
        transaction,
      ),
  });
}

export function retiroEfectivoController({
  type,
  payload,
  requestId,
  userToken,
}) {
  return runTransaction({
    type,
    requestId,
    successMessage: "Retiro en efectivo realizado correctamente",
    operation: (transaction) =>
      retirarEfectivo(
        {
          idCuentaOrigen: Number(payload?.idCuentaOrigen),
          monto: Number(payload?.monto),
        },
        userToken,
        transaction,
      ),
  });
}

export async function movimientosTransaccionController({
  type,
  payload,
  requestId,
  userToken,
}) {
  try {
    const data = await getTransaccionesByCuenta(
      Number(payload?.idCuenta),
      userToken,
    );

    return createSuccessResponse({
      type,
      requestId,
      message: "Movimientos de transacciones obtenidos correctamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export function reversionController({
  type,
  payload,
  requestId,
  userToken,
}) {
  if (!payload?.idTransaccionOriginal) {
    return createErrorResponse({
      type,
      requestId,
      error: createNewError(
        "La transacción original es obligatoria",
        "TRANSACCION_REQUERIDA",
      ),
    });
  }

  return runTransaction({
    type,
    requestId,
    successMessage: "Transacción revertida correctamente",
    operation: (transaction) =>
      revertirTransaccion(
        Number(payload.idTransaccionOriginal),
        userToken,
        transaction,
      ),
  });
}
