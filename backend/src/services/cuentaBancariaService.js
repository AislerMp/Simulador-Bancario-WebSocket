import { createNewError, validarID } from "../utils/helpers.js";
import {
  registrarEvento,
  BITACORA_ACCIONES,
} from "../services/bitacoraService.js";
import {
  createCuentaBancaria,
  getCuentaById,
  getCuentasByUser,
  getCuentaByNumero,
  updateEstadoCuenta,
} from "../repositories/cuentaBancariaRepositorie.js";
import { getUserById } from "../repositories/authRepositorie.js";

function generarCuentaIBANRandom() {
  const pais = "CR";
  // Genera dígitos de control fijos o aleatorios
  let digitosControl = Math.floor(Math.random() * 90 + 10).toString();
  const reservado = "0";

  // Simplificación usando string padding para evitar bucles for innecesarios
  let codigoBanco = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  let numeroCuenta = Math.floor(Math.random() * 100000000000000)
    .toString()
    .padStart(14, "0");

  const cuentaIBAN =
    pais + digitosControl + reservado + codigoBanco + numeroCuenta;
  console.log(`CUENTA IBAN GENERADA: ${cuentaIBAN}`);
  return cuentaIBAN;
}

export async function createCuentaBancariaService(idUsuario, usuarioActual) {
  validarID(idUsuario, "USUARIO");

  if (!(await getUserById(idUsuario))) {
    throw createNewError("Usuario No existe", "USER_NOT_FOUND");
  }

  let numeroCuenta;
  let existeCuenta = true;

  while (existeCuenta) {
    numeroCuenta = generarCuentaIBANRandom();
    if (!(await getCuentaByNumero(numeroCuenta))) existeCuenta = false;
  }

  if (usuarioActual.rol !== "ADMINISTRADOR")
    throw createNewError(
      "NO tiene permiso de Administrador",
      "USUARIO_SIN_PERMISOS",
    );

  const nuevaCuenta = await createCuentaBancaria(idUsuario, numeroCuenta);
  await registrarEvento({
    idUsuario,
    accion: BITACORA_ACCIONES.CREAR_CUENTA,
    descripcion: `Cuenta ${numero_cuenta} creada correctamente.`,
  });

  return nuevaCuenta;
}

export async function getCuenta(idCuenta) {
  validarID(idCuenta, "CUENTA");

  const cuenta = await getCuentaById(idCuenta);
  if (!cuenta)
    throw createNewError("La cuenta no ha sido encontrada", "CUENTA_NOT_FOUND");

  return cuenta;
}

export async function getCuentasUsuario(idUsuario) {
  validarID(idUsuario, "USUARIO");

  if (!(await getUserById(idUsuario)))
    throw createNewError("Usuario No existe", "USER_NOT_FOUND");

  return await getCuentasByUser(idUsuario);
}

export async function cambiarEstadoCuenta(
  idCuenta,
  idUsuario,
  estadoCuenta,
  usuarioActual,
) {
  const estadosValidos = ["ACTIVA", "INACTIVA", "BLOQUEADA"];

  validarID(idCuenta, "CUENTA");

  const cuenta = await getCuentaById(idCuenta);
  if (!cuenta)
    throw createNewError("La cuenta no ha sido encontrada", "CUENTA_NOT_FOUND");

  if (usuarioActual.rol !== "ADMINISTRADOR")
    throw createNewError(
      "NO tiene permiso de Administrador",
      "USUARIO_SIN_PERMISOS",
    );

  if (!estadosValidos.includes(estadoCuenta))
    throw createNewError("Estado brindado no es Valido", "ESTADO_INVALIDO");

  return await updateEstadoCuenta(idCuenta, idUsuario, estadoCuenta);
}
