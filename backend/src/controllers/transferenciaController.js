import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/helpers.js";

import { beginTransaction } from "../config/database.js";

import { depositar, transferir } from "../services/transaccionService.js";

export async function depositoController({
  type,
  payload,
  requestId,
  userToken,
}) {
  let transaction;

  try {
    transaction = await beginTransaction();

    const resultado = await depositar(
      { idCuentaDestino: payload?.idCuentaDestino, monto: payload?.monto },
      transaction,
    );

    await transaction.commit();

    return createSuccessResponse({
      type: type,
      requestId,
      message: "Depósito realizado correctamente",
      data: resultado,
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return createErrorResponse({
      type: type,
      requestId,
      error,
    });
  }
}

export async function transferenciaController({
  type,
  payload,
  requestId,
  userToken,
}) {
  let transaction;

  try {
    transaction = await beginTransaction();

    const resultado = await transferir({
        idCuentaOrigen: payload?.idCuentaOrigen,
        idCuentaDestino: payload?.idCuentaDestino,
        monto: payload?.monto,
      },
      transaction,
    );

    await transaction.commit();

    return createSuccessResponse({
      type: type,
      requestId,
      message: "Transferencia realizada correctamente",
      data: resultado,
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    return createErrorResponse({
      type: type,
      requestId,
      error,
    });
  }
}
