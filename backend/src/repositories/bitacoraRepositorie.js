import { getConnection, sql, createRequest } from "../config/database.js";

export async function createMovimiento({
  idUsuario,
  accion,
  descripcion,
  ip_origen,
}, transaction = null) {
  const request = await createRequest(transaction);

  const result = await request
    .input("id_usuario", sql.Int, idUsuario)
    .input("accion", sql.VarChar, accion)
    .input("descripcion", sql.VarChar, descripcion)
    .input("ip_origen", sql.VarChar, ip_origen).query(`
        INSERT INTO Bitacora (id_usuario, accion, descripcion, ip_origen) 
        OUTPUT
            INSERTED.id_bitacora,
            INSERTED.id_usuario,
            INSERTED.accion,
            INSERTED.descripcion,
            INSERTED.fecha_hora,
            INSERTED.ip_origen
        VALUES (@id_usuario, @accion, @descripcion, @ip_origen);
    `);

  console.log("Movimiento creado", result);
  return result.recordset[0] || null;
}

export async function getMovimientosUsuario(idUsuario) {
  const pool = await getConnection();

  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .query("SELECT * FROM Bitacora WHERE id_usuario = @id_usuario;");

  console.log("Movimientos por usuario", idUsuario, result);
  return result.recordset || null;
}

export async function getMovimientos() {
  const pool = await getConnection();
  const result = await pool.request().query("SELECT * FROM Bitacora;");
  return result.recordset || null;
}
