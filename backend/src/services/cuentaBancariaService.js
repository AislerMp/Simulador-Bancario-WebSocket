import { randomInt } from "node:crypto";
import { createNewError, validarID } from "../utils/helpers.js";
import {
  registrarEvento,
  BITACORA_ACCIONES,
} from "./bitacoraService.js";
import {
  createCuentaBancaria,
  getCuentaById,
  getCuentasByUser,
  getCuentaByNumero,
  updateEstadoCuenta,
  getTodasCuentas,
} from "../repositories/cuentaBancariaRepositorie.js";
import { getUserById } from "../repositories/authRepositorie.js";

function generarCuentaIBANRandom() {
  const control = String(randomInt(10, 100));
  const banco = String(randomInt(0, 1000)).padStart(3, "0");
  const cuenta = String(randomInt(0, 1000000000)).padStart(14, "0");
  return `CR${control}0${banco}${cuenta}`;
}

function assertAdministrator(userToken) {
  if (userToken?.rol !== "ADMINISTRADOR") {
    throw createNewError(
      "No tiene permisos de administrador",
      "USUARIO_SIN_PERMISOS",
    );
  }
}

export async function createCuentaBancariaService(idUsuario, usuarioActual) {
  validarID(idUsuario, "USUARIO");
  assertAdministrator(usuarioActual);

  const user = await getUserById(idUsuario);
  if (!user) {
    throw createNewError("El usuario no existe", "USER_NOT_FOUND");
  }

  let numeroCuenta;
  do {
    numeroCuenta = generarCuentaIBANRandom();
  } while (await getCuentaByNumero(numeroCuenta));

  const nuevaCuenta = await createCuentaBancaria(idUsuario, numeroCuenta);

  await registrarEvento({
    idUsuario: usuarioActual.idUsuario,
    accion: BITACORA_ACCIONES.CREAR_CUENTA,
    descripcion: `Se creó la cuenta ${numeroCuenta} para el usuario ${idUsuario}.`,
  });

  return nuevaCuenta;
}

export async function getCuenta(idCuenta, usuarioActual) {
  validarID(idCuenta, "CUENTA");

  const cuenta = await getCuentaById(idCuenta);
  if (!cuenta) {
    throw createNewError("La cuenta no fue encontrada", "CUENTA_NOT_FOUND");
  }

  if (
    usuarioActual?.rol !== "ADMINISTRADOR" &&
    Number(cuenta.id_usuario) !== Number(usuarioActual?.idUsuario)
  ) {
    throw createNewError(
      "No tiene permiso para consultar esa cuenta",
      "USUARIO_SIN_PERMISOS",
    );
  }

  return cuenta;
}

export async function getCuentasUsuario(idUsuario) {
  validarID(idUsuario, "USUARIO");

  if (!(await getUserById(idUsuario))) {
    throw createNewError("El usuario no existe", "USER_NOT_FOUND");
  }

  return getCuentasByUser(idUsuario);
}

export async function cambiarEstadoCuenta(
  idCuenta,
  idUsuario,
  estadoCuenta,
  usuarioActual,
) {
  assertAdministrator(usuarioActual);
  validarID(idCuenta, "CUENTA");
  validarID(idUsuario, "USUARIO");

  const estado = String(estadoCuenta || "").trim().toUpperCase();
  const estadosValidos = ["ACTIVA", "INACTIVA", "BLOQUEADA"];

  if (!estadosValidos.includes(estado)) {
    throw createNewError("El estado no es válido", "ESTADO_INVALIDO");
  }

  const cuenta = await getCuentaById(idCuenta);
  if (!cuenta) {
    throw createNewError("La cuenta no fue encontrada", "CUENTA_NOT_FOUND");
  }

  const actualizado = await updateEstadoCuenta(idCuenta, idUsuario, estado);
  if (!actualizado) {
    throw createNewError(
      "La cuenta no pertenece al usuario indicado",
      "CUENTA_USUARIO_NO_COINCIDE",
    );
  }

  await registrarEvento({
    idUsuario: usuarioActual.idUsuario,
    accion: BITACORA_ACCIONES.CAMBIAR_ESTADO_CUENTA,
    descripcion: `Se cambió la cuenta ${cuenta.numero_cuenta} al estado ${estado}.`,
  });

  return { ...cuenta, estado };
}

export async function getCuentasAdministrador(usuarioActual) {
  assertAdministrator(usuarioActual);
  return getTodasCuentas();
}

export async function buscarCuentaPorNumero(numeroCuenta) {
  const iban = String(numeroCuenta || "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();

  if (!/^CR\d{20}$/.test(iban)) {
    throw createNewError(
      "El número IBAN no tiene un formato válido",
      "IBAN_INVALIDO",
    );
  }

  const cuenta = await getCuentaByNumero(iban);

  if (!cuenta) {
    throw createNewError(
      "La cuenta destino no existe",
      "CUENTA_DESTINO_NO_EXISTE",
    );
  }

  const estado = String(cuenta.estado || "").trim().toUpperCase();
  if (estado !== "ACTIVA") {
    throw createNewError(
      `La cuenta destino no está activa. Estado actual: ${estado}`,
      "CUENTA_DESTINO_INACTIVA",
    );
  }

  return {
    idCuenta: cuenta.id_cuenta,
    numeroCuenta: cuenta.numero_cuenta,
    estado,
    nombreBeneficiario: cuenta.nombre_usuario,
  };
}
