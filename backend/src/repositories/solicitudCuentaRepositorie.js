import {
  createRequest,
  sql,
} from "../config/database.js";

export async function createSolicitudCuenta(
  idUsuario,
  tipoCuenta,
  transaction = null,
) {
  const request = await createRequest(transaction);

  const result = await request
    .input("id_usuario", sql.Int, idUsuario)
    .input(
      "tipo_cuenta",
      sql.VarChar(20),
      tipoCuenta,
    )
    .query(`
      INSERT INTO dbo.Solicitud_Cuenta (
        id_usuario,
        tipo_cuenta
      )
      OUTPUT INSERTED.*
      VALUES (
        @id_usuario,
        @tipo_cuenta
      );
    `);

  return result.recordset[0] || null;
}

export async function getSolicitudPendiente(
  idUsuario,
  tipoCuenta,
  transaction = null,
) {
  const request = await createRequest(transaction);

  const result = await request
    .input("id_usuario", sql.Int, idUsuario)
    .input(
      "tipo_cuenta",
      sql.VarChar(20),
      tipoCuenta,
    )
    .query(`
      SELECT TOP 1 *
      FROM dbo.Solicitud_Cuenta
      WHERE id_usuario = @id_usuario
        AND tipo_cuenta = @tipo_cuenta
        AND estado = 'PENDIENTE';
    `);

  return result.recordset[0] || null;
}

export async function getSolicitudesUsuario(
  idUsuario,
) {
  const request = await createRequest();

  const result = await request
    .input("id_usuario", sql.Int, idUsuario)
    .query(`
      SELECT
        s.id_solicitud,
        s.id_usuario,
        s.tipo_cuenta,
        s.estado,
        s.fecha_solicitud,
        s.fecha_respuesta,
        s.observacion,
        s.id_cuenta_creada,
        c.numero_cuenta
      FROM dbo.Solicitud_Cuenta AS s
      LEFT JOIN dbo.Cuenta_Bancaria AS c
        ON c.id_cuenta = s.id_cuenta_creada
      WHERE s.id_usuario = @id_usuario
      ORDER BY s.fecha_solicitud DESC;
    `);

  return result.recordset || [];
}

export async function getSolicitudesPendientes() {
  const request = await createRequest();

  const result = await request.query(`
    SELECT
      s.id_solicitud,
      s.id_usuario,
      s.tipo_cuenta,
      s.estado,
      s.fecha_solicitud,
      u.nombre AS nombre_usuario,
      u.correo AS correo_usuario
    FROM dbo.Solicitud_Cuenta AS s
    INNER JOIN dbo.Usuario AS u
      ON u.id_usuario = s.id_usuario
    WHERE s.estado = 'PENDIENTE'
    ORDER BY s.fecha_solicitud ASC;
  `);

  return result.recordset || [];
}

export async function getSolicitudByIdForUpdate(
  idSolicitud,
  transaction,
) {
  const request = await createRequest(transaction);

  const result = await request
    .input(
      "id_solicitud",
      sql.Int,
      idSolicitud,
    )
    .query(`
      SELECT TOP 1
        s.*,
        u.nombre AS nombre_usuario,
        u.correo AS correo_usuario,
        u.activo AS usuario_activo
      FROM dbo.Solicitud_Cuenta AS s
      INNER JOIN dbo.Usuario AS u
        ON u.id_usuario = s.id_usuario
      WHERE s.id_solicitud = @id_solicitud;
    `);

  return result.recordset[0] || null;
}

export async function updateSolicitudDecision(
  {
    idSolicitud,
    estado,
    idAdministrador,
    observacion = null,
    idCuentaCreada = null,
  },
  transaction,
) {
  const request = await createRequest(transaction);

  const result = await request
    .input(
      "id_solicitud",
      sql.Int,
      idSolicitud,
    )
    .input(
      "estado",
      sql.VarChar(20),
      estado,
    )
    .input(
      "id_administrador",
      sql.Int,
      idAdministrador,
    )
    .input(
      "observacion",
      sql.VarChar(255),
      observacion,
    )
    .input(
      "id_cuenta_creada",
      sql.Int,
      idCuentaCreada,
    )
    .query(`
      UPDATE dbo.Solicitud_Cuenta
      SET
        estado = @estado,
        fecha_respuesta = SYSDATETIME(),
        id_administrador = @id_administrador,
        observacion = @observacion,
        id_cuenta_creada = @id_cuenta_creada
      OUTPUT INSERTED.*
      WHERE id_solicitud = @id_solicitud
        AND estado = 'PENDIENTE';
    `);

  return result.recordset[0] || null;
}