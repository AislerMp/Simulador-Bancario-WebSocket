import * as transaccionRepo from "../repositories/transaccionRepositorie.js";
import { validarID, createNewError } from "../utils/helpers.js";
import {
  ESTADOS_TRANSACCION,
  MTI,
  TIPOS_TRANSACCION,
  generarReferencia,
  ISO_RESPONSE_CODES,
} from "../utils/transactionUtils.js";
import {
  getCuentaById,
  updateSaldoCuenta,
} from "../repositories/cuentaBancariaRepositorie.js";
import {
  registrarEvento,
  BITACORA_ACCIONES,
} from "./bitacoraService.js";

function validateAmount(monto) {
  if (!Number.isInteger(monto) || monto <= 0) {
    throw createNewError(
      "El monto debe ser un número entero positivo",
      "MONTO_NO_VALIDO",
    );
  }
}

function assertActiveAccount(cuenta, label = "cuenta") {
  if (!cuenta) {
    throw createNewError(`La ${label} no existe`, "CUENTA_NOT_FOUND");
  }

  if (String(cuenta.estado).trim().toUpperCase() !== "ACTIVA") {
    throw createNewError(`La ${label} no está activa`, "CUENTA_NOT_ACTIVE");
  }
}

function assertAccountOwnership(cuenta, usuarioActual) {
  if (Number(cuenta.id_usuario) !== Number(usuarioActual?.idUsuario)) {
    throw createNewError(
      "La cuenta de origen no pertenece al usuario autenticado",
      "CUENTA_NO_PERTENECE_USUARIO",
    );
  }
}

function assertAdministrator(usuarioActual) {
  if (usuarioActual?.rol !== "ADMINISTRADOR") {
    throw createNewError(
      "Esta operación es exclusiva para administradores",
      "USUARIO_SIN_PERMISOS",
    );
  }
}

async function approveTransaction(created, transaction) {
  await transaccionRepo.updateEstadoTransaccion(
    created.id_transaccion,
    ESTADOS_TRANSACCION.APROBADA,
    ISO_RESPONSE_CODES.APROBADA,
    transaction,
  );

  return transaccionRepo.getTransaccionById(
    created.id_transaccion,
    transaction,
  );
}

export async function depositar(
  transaccion,
  usuarioActual,
  transaction,
) {
  validarID(transaccion.idCuentaDestino, "CUENTA DESTINO");
  validateAmount(transaccion.monto);

  const cuentaDestino = await getCuentaById(
    transaccion.idCuentaDestino,
    transaction,
  );
  assertActiveAccount(cuentaDestino, "cuenta destino");

  assertAdministrator(usuarioActual);

  const created = await transaccionRepo.createTransaccion(
    {
      idCuentaOrigen: null,
      idCuentaDestino: transaccion.idCuentaDestino,
      tipo: TIPOS_TRANSACCION.DEPOSITO,
      monto: transaccion.monto,
      referencia: generarReferencia("EFC"),
      mti: MTI.DEPOSITO,
      codigoRespuesta: null,
      idTransaccionOriginal: null,
    },
    transaction,
  );

  const updated = await updateSaldoCuenta(
    transaccion.idCuentaDestino,
    transaccion.monto,
    "+",
    transaction,
  );

  if (!updated) {
    throw createNewError(
      "No se pudo actualizar el saldo",
      "ERROR_ACTUALIZAR_SALDO",
    );
  }

  await registrarEvento(
    {
      idUsuario: cuentaDestino.id_usuario,
      accion: BITACORA_ACCIONES.DEPOSITO,
      descripcion: `Depósito de ₡${transaccion.monto} recibido en la cuenta ${cuentaDestino.numero_cuenta}.`,
    },
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: usuarioActual.idUsuario,
      accion: BITACORA_ACCIONES.DEPOSITO_EFECTIVO,
      descripcion: `Se aplicó un depósito en efectivo de ₡${transaccion.monto} a la cuenta ${cuentaDestino.numero_cuenta}.`,
    },
    transaction,
  );

  return approveTransaction(created, transaction);
}

export async function transferir(transaccion, usuarioActual, transaction) {
  validarID(transaccion.idCuentaOrigen, "CUENTA ORIGEN");
  validarID(transaccion.idCuentaDestino, "CUENTA DESTINO");
  validateAmount(transaccion.monto);

  if (transaccion.idCuentaOrigen === transaccion.idCuentaDestino) {
    throw createNewError(
      "La cuenta origen y destino no pueden ser iguales",
      "SAME_ACCOUNTS",
    );
  }

  const cuentaOrigen = await getCuentaById(
    transaccion.idCuentaOrigen,
    transaction,
  );
  const cuentaDestino = await getCuentaById(
    transaccion.idCuentaDestino,
    transaction,
  );

  assertActiveAccount(cuentaOrigen, "cuenta de origen");
  assertActiveAccount(cuentaDestino, "cuenta de destino");
  assertAccountOwnership(cuentaOrigen, usuarioActual);

  if (Number(cuentaOrigen.saldo_actual) < transaccion.monto) {
    throw createNewError(
      "Saldo insuficiente en la cuenta de origen",
      "SALDO_INSUFICIENTE",
    );
  }

  const created = await transaccionRepo.createTransaccion(
    {
      idCuentaOrigen: transaccion.idCuentaOrigen,
      idCuentaDestino: transaccion.idCuentaDestino,
      tipo: TIPOS_TRANSACCION.TRANSFERENCIA,
      monto: transaccion.monto,
      referencia: generarReferencia("TRF"),
      mti: MTI.TRANSFERENCIA,
      codigoRespuesta: null,
      idTransaccionOriginal: null,
    },
    transaction,
  );

  const debited = await updateSaldoCuenta(
    transaccion.idCuentaOrigen,
    transaccion.monto,
    "-",
    transaction,
  );
  const credited = await updateSaldoCuenta(
    transaccion.idCuentaDestino,
    transaccion.monto,
    "+",
    transaction,
  );

  if (!debited) {
    throw createNewError("Saldo insuficiente", "SALDO_INSUFICIENTE");
  }

  if (!credited) {
    throw createNewError(
      "No se pudo acreditar la cuenta destino",
      "ERROR_ACTUALIZAR_SALDO_DESTINO",
    );
  }

  await registrarEvento(
    {
      idUsuario: cuentaOrigen.id_usuario,
      accion: BITACORA_ACCIONES.TRANSFERENCIA,
      descripcion: `Transferencia de ₡${transaccion.monto} enviada a ${cuentaDestino.numero_cuenta}.`,
    },
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: cuentaDestino.id_usuario,
      accion: BITACORA_ACCIONES.TRANSFERENCIA,
      descripcion: `Transferencia de ₡${transaccion.monto} recibida desde ${cuentaOrigen.numero_cuenta}.`,
    },
    transaction,
  );

  return approveTransaction(created, transaction);
}

export async function pagoServicio(transaccion, usuarioActual, transaction) {
  validarID(transaccion.idCuentaOrigen, "CUENTA ORIGEN");
  validateAmount(transaccion.monto);

  const nombreServicio = String(transaccion.nombreServicio || "").trim();
  const referenciaServicio = String(
    transaccion.referenciaServicio || "",
  ).trim();

  if (!nombreServicio || !referenciaServicio) {
    throw createNewError(
      "Los datos del servicio son obligatorios",
      "DATOS_SERVICIO_INCOMPLETOS",
    );
  }

  const cuentaOrigen = await getCuentaById(
    transaccion.idCuentaOrigen,
    transaction,
  );

  assertActiveAccount(cuentaOrigen, "cuenta de origen");
  assertAccountOwnership(cuentaOrigen, usuarioActual);

  if (Number(cuentaOrigen.saldo_actual) < transaccion.monto) {
    throw createNewError(
      "Saldo insuficiente en la cuenta de origen",
      "SALDO_INSUFICIENTE",
    );
  }

  const created = await transaccionRepo.createTransaccion(
    {
      idCuentaOrigen: transaccion.idCuentaOrigen,
      idCuentaDestino: null,
      tipo: TIPOS_TRANSACCION.PAGO,
      monto: transaccion.monto,
      nombreServicio,
      referenciaServicio,
      referencia: generarReferencia("PSV"),
      mti: MTI.PAGO,
      codigoRespuesta: null,
      idTransaccionOriginal: null,
    },
    transaction,
  );

  const debited = await updateSaldoCuenta(
    transaccion.idCuentaOrigen,
    transaccion.monto,
    "-",
    transaction,
  );

  if (!debited) {
    throw createNewError("Saldo insuficiente", "SALDO_INSUFICIENTE");
  }

  await registrarEvento(
    {
      idUsuario: cuentaOrigen.id_usuario,
      accion: BITACORA_ACCIONES.PAGO,
      descripcion: `Pago de ${nombreServicio} por ₡${transaccion.monto}.`,
    },
    transaction,
  );

  return approveTransaction(created, transaction);
}

export async function retirarEfectivo(
  transaccion,
  usuarioActual,
  transaction,
) {
  assertAdministrator(usuarioActual);
  validarID(transaccion.idCuentaOrigen, "CUENTA ORIGEN");
  validateAmount(transaccion.monto);

  const cuentaOrigen = await getCuentaById(
    transaccion.idCuentaOrigen,
    transaction,
  );
  assertActiveAccount(cuentaOrigen, "cuenta de origen");

  if (Number(cuentaOrigen.saldo_actual) < transaccion.monto) {
    throw createNewError(
      "Saldo insuficiente para realizar el retiro",
      "SALDO_INSUFICIENTE",
    );
  }

  const created = await transaccionRepo.createTransaccion(
    {
      idCuentaOrigen: transaccion.idCuentaOrigen,
      idCuentaDestino: null,
      tipo: TIPOS_TRANSACCION.RETIRO,
      monto: transaccion.monto,
      referencia: generarReferencia("RET"),
      mti: MTI.RETIRO,
      codigoRespuesta: null,
      idTransaccionOriginal: null,
    },
    transaction,
  );

  const debited = await updateSaldoCuenta(
    transaccion.idCuentaOrigen,
    transaccion.monto,
    "-",
    transaction,
  );

  if (!debited) {
    throw createNewError("Saldo insuficiente", "SALDO_INSUFICIENTE");
  }

  await registrarEvento(
    {
      idUsuario: cuentaOrigen.id_usuario,
      accion: BITACORA_ACCIONES.RETIRO,
      descripcion: `Retiro en efectivo de ₡${transaccion.monto} aplicado a la cuenta ${cuentaOrigen.numero_cuenta}.`,
    },
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: usuarioActual.idUsuario,
      accion: BITACORA_ACCIONES.RETIRO,
      descripcion: `Se atendió un retiro en efectivo de ₡${transaccion.monto} de la cuenta ${cuentaOrigen.numero_cuenta}.`,
    },
    transaction,
  );

  return approveTransaction(created, transaction);
}

export async function getTransaccionesByCuenta(
  idCuenta,
  usuarioActual,
  transaction = null,
) {
  validarID(idCuenta, "CUENTA");

  const cuenta = await getCuentaById(idCuenta, transaction);
  if (!cuenta) {
    throw createNewError("La cuenta no existe", "CUENTA_NOT_FOUND");
  }

  if (
    usuarioActual?.rol !== "ADMINISTRADOR" &&
    Number(cuenta.id_usuario) !== Number(usuarioActual?.idUsuario)
  ) {
    throw createNewError(
      "No tiene permiso para consultar estas transacciones",
      "USUARIO_SIN_PERMISOS",
    );
  }

  return transaccionRepo.getTransaccionesByCuenta(idCuenta, transaction);
}

export async function revertirTransaccion(
  idTransaccionOriginal,
  usuarioActual,
  transaction,
) {
  assertAdministrator(usuarioActual);
  validarID(idTransaccionOriginal, "TRANSACCIÓN ORIGINAL");

  const original = await transaccionRepo.getTransaccionById(
    idTransaccionOriginal,
    transaction,
  );

  if (!original) {
    throw createNewError(
      "La transacción original no existe",
      "TRANSACCION_NO_ENCONTRADA",
    );
  }

  if (original.tipo === TIPOS_TRANSACCION.REVERSION) {
    throw createNewError(
      "Una reversión no puede ser revertida",
      "REVERSION_NO_PERMITIDA",
    );
  }

  if (original.estado !== ESTADOS_TRANSACCION.APROBADA) {
    throw createNewError(
      "Solo se pueden revertir transacciones aprobadas",
      "TRANSACCION_NO_APROBADA",
    );
  }

  if (await transaccionRepo.getReversionByOriginal(idTransaccionOriginal, transaction)) {
    throw createNewError(
      "La transacción ya fue revertida",
      "TRANSACCION_YA_REVERTIDA",
    );
  }

  let idCuentaOrigenReversion = null;
  let idCuentaDestinoReversion = null;

  if (original.tipo === TIPOS_TRANSACCION.TRANSFERENCIA) {
    const removed = await updateSaldoCuenta(
      original.id_cuenta_destino,
      Number(original.monto),
      "-",
      transaction,
    );

    if (!removed) {
      throw createNewError(
        "La cuenta que recibió la transferencia no tiene saldo suficiente para revertirla",
        "SALDO_INSUFICIENTE_REVERSION",
      );
    }

    await updateSaldoCuenta(
      original.id_cuenta_origen,
      Number(original.monto),
      "+",
      transaction,
    );

    idCuentaOrigenReversion = original.id_cuenta_destino;
    idCuentaDestinoReversion = original.id_cuenta_origen;
  } else if (original.tipo === TIPOS_TRANSACCION.DEPOSITO) {
    const removed = await updateSaldoCuenta(
      original.id_cuenta_destino,
      Number(original.monto),
      "-",
      transaction,
    );

    if (!removed) {
      throw createNewError(
        "La cuenta no tiene saldo suficiente para revertir el depósito",
        "SALDO_INSUFICIENTE_REVERSION",
      );
    }

    idCuentaOrigenReversion = original.id_cuenta_destino;
  } else if (
    original.tipo === TIPOS_TRANSACCION.PAGO ||
    original.tipo === TIPOS_TRANSACCION.RETIRO
  ) {
    await updateSaldoCuenta(
      original.id_cuenta_origen,
      Number(original.monto),
      "+",
      transaction,
    );

    idCuentaDestinoReversion = original.id_cuenta_origen;
  } else {
    throw createNewError(
      "El tipo de transacción no admite reversión",
      "REVERSION_NO_PERMITIDA",
    );
  }

  const reversion = await transaccionRepo.createTransaccion(
    {
      idCuentaOrigen: idCuentaOrigenReversion,
      idCuentaDestino: idCuentaDestinoReversion,
      tipo: TIPOS_TRANSACCION.REVERSION,
      monto: Number(original.monto),
      referencia: generarReferencia("REV"),
      mti: MTI.REVERSION,
      codigoRespuesta: null,
      idTransaccionOriginal,
    },
    transaction,
  );

  await transaccionRepo.updateEstadoTransaccion(
    reversion.id_transaccion,
    ESTADOS_TRANSACCION.APROBADA,
    ISO_RESPONSE_CODES.APROBADA,
    transaction,
  );

  await transaccionRepo.updateEstadoTransaccion(
    original.id_transaccion,
    ESTADOS_TRANSACCION.REVERTIDA,
    ISO_RESPONSE_CODES.YA_REVERTIDA,
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: usuarioActual.idUsuario,
      accion: BITACORA_ACCIONES.REVERSION,
      descripcion: `Se revirtió la transacción ${original.referencia} por ₡${original.monto}.`,
    },
    transaction,
  );

  return transaccionRepo.getTransaccionById(
    reversion.id_transaccion,
    transaction,
  );
}
