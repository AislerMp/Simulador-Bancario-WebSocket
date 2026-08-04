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
  RECUPERACION_PASSWORD: "RECUPERACION_PASSWORD",
  CAMBIO_PASSWORD: "CAMBIO_PASSWORD",
  CREAR_CUENTA: "CREAR_CUENTA",
  CAMBIAR_ESTADO_CUENTA: "CAMBIAR_ESTADO_CUENTA",
  TRANSFERENCIA: "TRANSFERENCIA",
  RETIRO: "RETIRO",
  DEPOSITO: "DEPOSITO",
  DEPOSITO_EFECTIVO: "DEPOSITO_EFECTIVO",
  PAGO: "PAGO",
  REVERSION: "REVERSION",
  SOLICITUD_CUENTA: "SOLICITUD_CUENTA",
  APROBAR_SOLICITUD_CUENTA:"APROBAR_SOLICITUD_CUENTA",
  RECHAZAR_SOLICITUD_CUENTA:"RECHAZAR_SOLICITUD_CUENTA",    
  LOGOUT: "LOGOUT",
};

export async function registrarEvento(
  { idUsuario, accion, descripcion, ip_origen = null },
  transaction = null,
) {
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

  return createMovimiento(
    { idUsuario, accion, descripcion, ip_origen },
    transaction,
  );
}

export async function getMovimientosUsuarioService(idUsuario, usuarioActual) {
  validarID(idUsuario, "USUARIO");

  if (
    usuarioActual?.rol !== "ADMINISTRADOR" &&
    Number(usuarioActual?.idUsuario) !== Number(idUsuario)
  ) {
    throw createNewError(
      "No tiene permiso para consultar esa bitácora",
      "USUARIO_SIN_PERMISOS",
    );
  }

  return getMovimientosUsuario(idUsuario);
}

export async function getMovimientosService(usuarioActual) {
  if (usuarioActual?.rol !== "ADMINISTRADOR") {
    throw createNewError(
      "No tiene permisos de administrador",
      "USUARIO_SIN_PERMISOS",
    );
  }

  return getMovimientos();
}
