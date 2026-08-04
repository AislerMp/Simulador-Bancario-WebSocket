import { randomInt } from "node:crypto";

import {
  createNewError,
  validarID,
} from "../utils/helpers.js";

import {
  createSolicitudCuenta,
  getSolicitudPendiente,
  getSolicitudesUsuario,
  getSolicitudesPendientes,
  getSolicitudByIdForUpdate,
  updateSolicitudDecision,
} from "../repositories/solicitudCuentaRepositorie.js";

import {
  createCuentaBancaria,
  getCuentaByNumero,
} from "../repositories/cuentaBancariaRepositorie.js";

import {
  getUserById,
} from "../repositories/authRepositorie.js";

import {
  registrarEvento,
  BITACORA_ACCIONES,
} from "./bitacoraService.js";

function assertAdministrator(userToken) {
  if (userToken?.rol !== "ADMINISTRADOR") {
    throw createNewError(
      "Esta operación es exclusiva para administradores",
      "USUARIO_SIN_PERMISOS",
    );
  }
}

function assertClient(userToken) {
  if (userToken?.rol !== "CLIENTE") {
    throw createNewError(
      "Solamente los clientes pueden solicitar cuentas",
      "USUARIO_SIN_PERMISOS",
    );
  }
}

function normalizeAccountType(value) {
  const type = String(value || "")
    .trim()
    .toUpperCase();

  if (!["AHORROS", "CORRIENTE"].includes(type)) {
    throw createNewError(
      "El tipo de cuenta no es válido",
      "TIPO_CUENTA_INVALIDO",
    );
  }

  return type;
}

function generarCuentaIBANRandom() {
  const control = String(randomInt(10, 100));
  const banco = String(
    randomInt(0, 1000),
  ).padStart(3, "0");

  const cuenta = String(
    randomInt(0, 1000000000),
  ).padStart(14, "0");

  return `CR${control}0${banco}${cuenta}`;
}

async function generarNumeroCuentaUnico(
  transaction,
) {
  let numeroCuenta;

  do {
    numeroCuenta = generarCuentaIBANRandom();
  } while (
    await getCuentaByNumero(
      numeroCuenta,
      transaction,
    )
  );

  return numeroCuenta;
}

export async function solicitarCuenta(
  tipoCuenta,
  userToken,
  transaction,
) {
  assertClient(userToken);

  const idUsuario = Number(userToken?.idUsuario);
  validarID(idUsuario, "USUARIO");

  const type = normalizeAccountType(tipoCuenta);

  const usuario = await getUserById(idUsuario);

  if (!usuario || !usuario.activo) {
    throw createNewError(
      "El usuario no está activo",
      "USUARIO_INACTIVO",
    );
  }

  const existing = await getSolicitudPendiente(
    idUsuario,
    type,
    transaction,
  );

  if (existing) {
    throw createNewError(
      `Ya existe una solicitud pendiente de tipo ${type}`,
      "SOLICITUD_DUPLICADA",
    );
  }

  const solicitud = await createSolicitudCuenta(
    idUsuario,
    type,
    transaction,
  );

  await registrarEvento(
    {
      idUsuario,
      accion:
        BITACORA_ACCIONES.SOLICITUD_CUENTA,
      descripcion:
        `Se solicitó una cuenta de tipo ${type}.`,
    },
    transaction,
  );

  return solicitud;
}

export async function consultarMisSolicitudes(
  userToken,
) {
  const idUsuario = Number(userToken?.idUsuario);
  validarID(idUsuario, "USUARIO");

  return getSolicitudesUsuario(idUsuario);
}

export async function consultarSolicitudesPendientes(
  userToken,
) {
  assertAdministrator(userToken);

  return getSolicitudesPendientes();
}

export async function aprobarSolicitud(
  idSolicitud,
  userToken,
  transaction,
) {
  assertAdministrator(userToken);
  validarID(idSolicitud, "SOLICITUD");

  const solicitud =
    await getSolicitudByIdForUpdate(
      idSolicitud,
      transaction,
    );

  if (!solicitud) {
    throw createNewError(
      "La solicitud no existe",
      "SOLICITUD_NO_ENCONTRADA",
    );
  }

  if (solicitud.estado !== "PENDIENTE") {
    throw createNewError(
      "La solicitud ya fue procesada",
      "SOLICITUD_YA_PROCESADA",
    );
  }

  if (!solicitud.usuario_activo) {
    throw createNewError(
      "El cliente se encuentra inactivo",
      "USUARIO_INACTIVO",
    );
  }

  const numeroCuenta =
    await generarNumeroCuentaUnico(
      transaction,
    );

  const cuenta = await createCuentaBancaria(
    solicitud.id_usuario,
    numeroCuenta,
    solicitud.tipo_cuenta,
    transaction,
  );

  const updated =
    await updateSolicitudDecision(
      {
        idSolicitud,
        estado: "APROBADA",
        idAdministrador:
          userToken.idUsuario,
        observacion:
          "Solicitud aprobada correctamente.",
        idCuentaCreada:
          cuenta.id_cuenta,
      },
      transaction,
    );

  if (!updated) {
    throw createNewError(
      "La solicitud ya fue procesada",
      "SOLICITUD_YA_PROCESADA",
    );
  }

  await registrarEvento(
    {
      idUsuario: solicitud.id_usuario,
      accion:
        BITACORA_ACCIONES
          .APROBAR_SOLICITUD_CUENTA,
      descripcion:
        `La solicitud ${idSolicitud} fue aprobada. ` +
        `Se creó la cuenta ${numeroCuenta}.`,
    },
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: userToken.idUsuario,
      accion:
        BITACORA_ACCIONES
          .APROBAR_SOLICITUD_CUENTA,
      descripcion:
        `Se aprobó la solicitud ${idSolicitud} ` +
        `del usuario ${solicitud.id_usuario}.`,
    },
    transaction,
  );

  return {
    solicitud: updated,
    cuenta,
  };
}

export async function rechazarSolicitud(
  idSolicitud,
  observacion,
  userToken,
  transaction,
) {
  assertAdministrator(userToken);
  validarID(idSolicitud, "SOLICITUD");

  const solicitud =
    await getSolicitudByIdForUpdate(
      idSolicitud,
      transaction,
    );

  if (!solicitud) {
    throw createNewError(
      "La solicitud no existe",
      "SOLICITUD_NO_ENCONTRADA",
    );
  }

  if (solicitud.estado !== "PENDIENTE") {
    throw createNewError(
      "La solicitud ya fue procesada",
      "SOLICITUD_YA_PROCESADA",
    );
  }

  const note = String(observacion || "")
    .trim()
    .slice(0, 255);

  const updated =
    await updateSolicitudDecision(
      {
        idSolicitud,
        estado: "RECHAZADA",
        idAdministrador:
          userToken.idUsuario,
        observacion:
          note ||
          "Solicitud rechazada por el administrador.",
        idCuentaCreada: null,
      },
      transaction,
    );

  if (!updated) {
    throw createNewError(
      "La solicitud ya fue procesada",
      "SOLICITUD_YA_PROCESADA",
    );
  }

  await registrarEvento(
    {
      idUsuario: solicitud.id_usuario,
      accion:
        BITACORA_ACCIONES
          .RECHAZAR_SOLICITUD_CUENTA,
      descripcion:
        `La solicitud ${idSolicitud} fue rechazada.`,
    },
    transaction,
  );

  await registrarEvento(
    {
      idUsuario: userToken.idUsuario,
      accion:
        BITACORA_ACCIONES
          .RECHAZAR_SOLICITUD_CUENTA,
      descripcion:
        `Se rechazó la solicitud ${idSolicitud} ` +
        `del usuario ${solicitud.id_usuario}.`,
    },
    transaction,
  );

  return updated;
}