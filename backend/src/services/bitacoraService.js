import { createNewError, validarID } from "../utils/helpers.js";
import {
  createMovimiento,
  getMovimientos,
  getMovimientosUsuario,
} from "../repositories/bitacoraRepositorie.js";

export const BITACORA_ACCIONES = {
  LOGIN: "LOGIN",

  REGISTRO: "REGISTRO",

  MFA: "MFA",

  CREAR_CUENTA: "CREAR_CUENTA",

  CAMBIAR_ESTADO_CUENTA: "CAMBIAR_ESTADO_CUENTA",

  TRANSFERENCIA: "TRANSFERENCIA",

  RETIRO: "RETIRO",

  DEPOSITO: "DEPOSITO",

  PAGO: "PAGO",
  
  LOGOUT: "LOGOUT",
};

export async function registrarEvento({
  idUsuario,
  accion,
  descripcion,
  ip_origen = null,
}, transaction = null) {
  validarID(idUsuario, "USUARIO");

  if (!accion?.trim()) {
    throw createNewError("La acción es obligatoria", "ACCION_INVALIDA");
  }

  if (!descripcion?.trim()) {
    throw createNewError(
      "La descripción es obligatoria",
      "DESCRIPCION_INVALIDA",
    );
  }

  return await createMovimiento({
    idUsuario,
    accion,
    descripcion,
    ip_origen,
  }, transaction);
}

export async function getMovimientosUsuarioService(idUsuario) {
  validarID(idUsuario, "USUARIO");

  const bitacoraUsuario = await getMovimientosUsuario(idUsuario);
  return bitacoraUsuario;
}

export async function getMovimientosService() {
  return getMovimientos();
}
