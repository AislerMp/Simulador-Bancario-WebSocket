import { randomInt } from "node:crypto";

export const TIPOS_TRANSACCION = {
  TRANSFERENCIA: "TRANSFERENCIA",
  DEPOSITO: "DEPOSITO",
  PAGO: "PAGO",
  REVERSION: "REVERSION",
};

export const ESTADOS_TRANSACCION = {
  PENDIENTE: "PENDIENTE",
  APROBADA: "APROBADA",
  RECHAZADA: "RECHAZADA",
  REVERTIDA: "REVERTIDA",
};

export const MTI = {
  DEPOSITO: "0200",
  TRANSFERENCIA: "0200",
  PAGO: "0200",
  REVERSION: "0400",
};

export const ISO_RESPONSE_CODES = {
  APROBADA: "00",

  // Cuenta
  CUENTA_INVALIDA: "14",
  CUENTA_BLOQUEADA: "62",
  CUENTA_NO_EXISTE: "25",

  // Fondos
  FONDOS_INSUFICIENTES: "51",

  // Seguridad
  TOKEN_INVALIDO: "55",
  USUARIO_NO_AUTORIZADO: "57",

  // Sistema
  ERROR_INTERNO: "96",
  TRANSACCION_DUPLICADA: "94",
  TRANSACCION_NO_ENCONTRADA: "12",

  // Reversiones
  YA_REVERTIDA: "24",
};

export function generarReferencia(prefijo = "TRX") {
  const ahora = new Date();

  const fecha =
    ahora.getFullYear().toString() +
    String(ahora.getMonth() + 1).padStart(2, "0") +
    String(ahora.getDate()).padStart(2, "0");

  const hora =
    String(ahora.getHours()).padStart(2, "0") +
    String(ahora.getMinutes()).padStart(2, "0") +
    String(ahora.getSeconds()).padStart(2, "0");

  const random = randomInt(100000, 999999);

  return `${prefijo}-${fecha}-${hora}-${random}`;
}
