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
} from "../services/bitacoraService.js";

export async function depositar(transaccion, transaction) {
  validarID(transaccion.idCuentaDestino, "Cuenta destino inválido");

  const cuentaDestino = await getCuentaById(
    transaccion.idCuentaDestino,
    transaction,
  );
  if (!cuentaDestino)
    throw createNewError("Cuenta Bancaria no EXISTE", "CUENTA_NOT_FOUND");

  if (cuentaDestino.estado !== "ACTIVA")
    throw createNewError("Cuenta Bancaria no esta ACTIVA", "CUENTA_NOT_ACTIVE");

  if (!Number.isInteger(transaccion.monto) || transaccion.monto <= 0)
    throw createNewError("Monto brindado no es valido", "MONTO_NO_VALIDO");

  transaccion.tipo = TIPOS_TRANSACCION.DEPOSITO;
  transaccion.referencia = generarReferencia("DEP");
  transaccion.mti = MTI.DEPOSITO;
  transaccion.codigoRespuesta = null;
  transaccion.idCuentaOrigen = null;
  transaccion.idTransaccionOriginal = null;

  console.log(transaccion);

  const createdTransaccion = await transaccionRepo.createTransaccion(
    transaccion,
    transaction,
  );

  const result = await updateSaldoCuenta(
    transaccion.idCuentaDestino,
    transaccion.monto,
    (operacion = "+"),
    transaction,
  );

  if (!result)
    throw createNewError(
      "No se pudo actualizar el saldo",
      "ERROR_ACTUALIZAR_SALDO",
    );

  await transaccionRepo.updateEstadoTransaccion(
    createdTransaccion.id_transaccion,
    ESTADOS_TRANSACCION.APROBADA,
    ISO_RESPONSE_CODES.APROBADA,
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: cuentaDestino.id_usuario,
      accion: BITACORA_ACCIONES.DEPOSITO,
      descripcion: `Depósito de ₡${transaccion.monto} realizado correctamente`,
    },
    transaction,
  );

  const returnTransaccion = await transaccionRepo.getTransaccionById(
    createdTransaccion.id_transaccion,
    transaction,
  );

  console.log(returnTransaccion);

  return returnTransaccion;
}

export async function transferir(transaccion, transaction) {
  validarID(transaccion.idCuentaOrigen, "Cuenta origen inválido");
  validarID(transaccion.idCuentaDestino, "Cuenta destino inválido");

  if (transaccion.idCuentaOrigen === transaccion.idCuentaDestino)
    throw createNewError("Cuentas bancarias son iguales", "SAME_ACCOUNTS");

  const cuentaOrigen = await getCuentaById(
    transaccion.idCuentaOrigen,
    transaction,
  );
  const cuentaDestino = await getCuentaById(
    transaccion.idCuentaDestino,
    transaction,
  );

  if (!cuentaOrigen || !cuentaDestino)
    throw createNewError(
      "Una o ambas cuentas bancarias no existen",
      "CUENTAS_NOT_FOUND",
    );

  if (cuentaOrigen.estado !== "ACTIVA" || cuentaDestino.estado !== "ACTIVA")
    throw createNewError(
      "Una o ambas cuentas bancarias no están activas",
      "CUENTAS_NOT_ACTIVE",
    );

  if (!Number.isInteger(transaccion.monto) || transaccion.monto <= 0)
    throw createNewError("Monto brindado no es valido", "MONTO_NO_VALIDO");

  if (cuentaOrigen.saldo_actual < transaccion.monto)
    throw createNewError(
      "Saldo insuficiente en la cuenta de origen",
      "SALDO_INSUFICIENTE",
    );

  transaccion.tipo = TIPOS_TRANSACCION.TRANSFERENCIA;
  transaccion.referencia = generarReferencia("TRF");
  transaccion.mti = MTI.TRANSFERENCIA;
  transaccion.codigoRespuesta = null;
  transaccion.idTransaccionOriginal = null;

  const createdTransaccion = await transaccionRepo.createTransaccion(
    transaccion,
    transaction,
  );

  console.log("Transacción creada:", createdTransaccion);

  const resultCuentaOrigen = await updateSaldoCuenta(
    transaccion.idCuentaOrigen,
    transaccion.monto,
    (operacion = "-"),
    transaction,
  );

  const resultCuentaDestino = await updateSaldoCuenta(
    transaccion.idCuentaDestino,
    transaccion.monto,
    (operacion = "+"),
    transaction,
  );

  if (!resultCuentaOrigen)
    throw createNewError(
      "No se pudo actualizar el saldo de la cuenta origen",
      "ERROR_ACTUALIZAR_SALDO_ORIGEN",
    );

  if (!resultCuentaDestino)
    throw createNewError(
      "No se pudo actualizar el saldo de la cuenta destino",
      "ERROR_ACTUALIZAR_SALDO_DESTINO",
    );

  await transaccionRepo.updateEstadoTransaccion(
    createdTransaccion.id_transaccion,
    ESTADOS_TRANSACCION.APROBADA,
    ISO_RESPONSE_CODES.APROBADA,
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: cuentaOrigen.id_usuario,
      accion: BITACORA_ACCIONES.TRANSFERENCIA,
      descripcion: `Transferencia de ₡${transaccion.monto} realizada correctamente a la cuenta ${cuentaDestino.numero_cuenta}`,
    },
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: cuentaDestino.id_usuario,
      accion: BITACORA_ACCIONES.TRANSFERENCIA,
      descripcion: `Transferencia de ₡${transaccion.monto} recibida correctamente desde la cuenta ${cuentaOrigen.numero_cuenta}`,
    },
    transaction,
  );

  const returnTransaccion = await transaccionRepo.getTransaccionById(
    createdTransaccion.id_transaccion,
    transaction,
  );

  console.log(returnTransaccion);

  return returnTransaccion;
}

export async function pagoServicio(transaccion, transaction) {
  validarID(transaccion.idCuentaOrigen, "Cuenta origen inválido");

  const cuentaOrigen = await getCuentaById(
    transaccion.idCuentaOrigen,
    transaction,
  );

  if (!cuentaOrigen)
    throw createNewError(
      "La cuenta de origen no existe",
      "CUENTA_ORIGEN_NOT_FOUND",
    );

  if (cuentaOrigen.estado !== "ACTIVA")
    throw createNewError(
      "La cuenta de origen no está activa",
      "CUENTA_ORIGEN_NOT_ACTIVE",
    );

  if (!transaccion.nombreServicio || !transaccion.referenciaServicio)
    throw createNewError(
      "Datos del servicio no proporcionados",
      "DATOS_SERVICIO_INCOMPLETOS",
    );

  if (!Number.isInteger(transaccion.monto) || transaccion.monto <= 0)
    throw createNewError("Monto brindado no es valido", "MONTO_NO_VALIDO");

  if (cuentaOrigen.saldo_actual < transaccion.monto)
    throw createNewError(
      "Saldo insuficiente en la cuenta de origen",
      "SALDO_INSUFICIENTE",
    );

  transaccion.tipo = TIPOS_TRANSACCION.PAGO;
  transaccion.referencia = generarReferencia("PSV");
  transaccion.mti = MTI.PAGO;
  transaccion.codigoRespuesta = null;
  transaccion.idCuentaDestino = null;
  transaccion.idTransaccionOriginal = null;

  const createdTransaccion = await transaccionRepo.createTransaccion(
    transaccion,
    transaction,
  );

  await updateSaldoCuenta(
    transaccion.idCuentaOrigen,
    transaccion.monto,
    "-",
    transaction,
  );

  await transaccionRepo.updateEstadoTransaccion(
    createdTransaccion.id_transaccion,
    ESTADOS_TRANSACCION.APROBADA,
    ISO_RESPONSE_CODES.APROBADA,
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: cuentaOrigen.id_usuario,
      accion: BITACORA_ACCIONES.PAGO,
      descripcion: `Pago de servicio '${transaccion?.nombreServicio}' por ₡${transaccion.monto}`,
    },
    transaction,
  );

  return await transaccionRepo.getTransaccionById(
    createdTransaccion.id_transaccion,
    transaction,
  );
}

export async function getTransaccionesByCuenta(idCuenta, transaction) {
  validarID(idCuenta, "Cuenta inválida");
  return await transaccionRepo.getTransaccionesByCuenta(idCuenta, transaction);
}

export async function revertirTransaccion(idTransaccion, transaction) {
  validarID(idTransaccion, "Transacción inválida");

  const original = await transaccionRepo.getTransaccionById(
    idTransaccion,
    transaction,
  );

  if (!original)
    throw createNewError("La transacción no existe", "TRANSACCION_NOT_FOUND");

  if (original.tipo !== TIPOS_TRANSACCION.TRANSFERENCIA)
    throw createNewError(
      "Solo se pueden revertir transferencias",
      "TIPO_NO_PERMITIDO",
    );

  if (original.estado !== ESTADOS_TRANSACCION.APROBADA)
    throw createNewError(
      "La transacción no puede revertirse",
      "TRANSACCION_INVALIDA",
    );

  const existeReversion = await transaccionRepo.getTransaccionOriginal(
    original.id_transaccion,
    transaction,
  );

  if (existeReversion && existeReversion.tipo === TIPOS_TRANSACCION.REVERSION)
    throw createNewError("La transacción ya fue revertida", "YA_REVERTIDA");

  const cuentaOrigen = await getCuentaById(
    original.id_cuenta_origen,
    transaction,
  );

  const cuentaDestino = await getCuentaById(
    original.id_cuenta_destino,
    transaction,
  );

  if (!cuentaOrigen || !cuentaDestino)
    throw createNewError("No existen las cuentas", "CUENTAS_NOT_FOUND");

  if (Number(cuentaDestino.saldo_actual) < Number(original.monto))
    throw createNewError(
      "La cuenta destino no tiene fondos suficientes para revertir",
      "SALDO_DESTINO_INSUFICIENTE",
    );

  const nueva = {
    idCuentaOrigen: original.id_cuenta_destino,
    idCuentaDestino: original.id_cuenta_origen,
    tipo: TIPOS_TRANSACCION.REVERSION,
    monto: original.monto,
    referencia: generarReferencia("REV"),
    mti: MTI.REVERSION,
    codigoRespuesta: null,
    idTransaccionOriginal: original.id_transaccion,
  };

  const creada = await transaccionRepo.createTransaccion(nueva, transaction);

  await updateSaldoCuenta(nueva.idCuentaOrigen, nueva.monto, "-", transaction);

  await updateSaldoCuenta(nueva.idCuentaDestino, nueva.monto, "+", transaction);

  await transaccionRepo.updateEstadoTransaccion(
    creada.id_transaccion,
    ESTADOS_TRANSACCION.APROBADA,
    ISO_RESPONSE_CODES.APROBADA,
    transaction,
  );

  await transaccionRepo.updateEstadoTransaccion(
    original.id_transaccion,
    ESTADOS_TRANSACCION.REVERTIDA,
    ISO_RESPONSE_CODES.APROBADA,
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: cuentaOrigen.id_usuario,
      accion: BITACORA_ACCIONES.REVERSION,
      descripcion: `Se revirtió la transferencia ${original.referencia}`,
    },
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: cuentaDestino.id_usuario,
      accion: BITACORA_ACCIONES.REVERSION,
      descripcion: `Se recibió la reversión de la transferencia ${original.referencia}`,
    },
    transaction,
  );

  return await transaccionRepo.getTransaccionById(
    creada.id_transaccion,
    transaction,
  );
}
