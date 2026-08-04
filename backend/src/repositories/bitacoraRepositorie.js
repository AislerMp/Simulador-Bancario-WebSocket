import { getConnection, sql, createRequest } from "../config/database.js";

export async function createMovimiento(
  { idUsuario, accion, descripcion, ip_origen },
  transaction = null,
) {
  const request = await createRequest(transaction);
  const result = await request
    .input("id_usuario", sql.Int, idUsuario)
    .input("accion", sql.VarChar(80), accion)
    .input("descripcion", sql.VarChar(255), descripcion)
    .input("ip_origen", sql.VarChar(45), ip_origen)
    .query(`
      INSERT INTO dbo.Bitacora
        (id_usuario, accion, descripcion, ip_origen)
      OUTPUT INSERTED.*
      VALUES (@id_usuario, @accion, @descripcion, @ip_origen);
    `);

  return result.recordset[0] || null;
}

export async function getMovimientosUsuario(idUsuario) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .query(`
      SELECT *
      FROM dbo.Bitacora
      WHERE id_usuario = @id_usuario
      ORDER BY fecha_hora DESC;
    `);

  return result.recordset || [];
}

export async function getMovimientos() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT
      b.*,
      u.nombre AS nombre_usuario,
      u.correo AS correo_usuario,
      u.rol AS rol_usuario
    FROM dbo.Bitacora AS b
    LEFT JOIN dbo.Usuario AS u
      ON u.id_usuario = b.id_usuario
    ORDER BY b.fecha_hora DESC;
  `);

  return result.recordset || [];
}
