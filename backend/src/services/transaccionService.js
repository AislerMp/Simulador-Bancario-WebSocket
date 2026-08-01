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
  
  const cuentaDestino = await getCuentaById(transaccion.idCuentaDestino, transaction);
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