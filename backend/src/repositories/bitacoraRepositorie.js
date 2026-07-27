import { getConnection, sql } from "../config/database.js";

async function insertMovimiento({ idUsuario, accion, descripción, ip_origen }) {
  const pool = await getConnection();

  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .input("accion", sql.VarChar, accion)
    .input("descripcion", sql.VarChar, descripción)
    .input("ip_origen", sql.VarChar, ip_origen).query(`
        INSERT INTO Bitacoras (id_usuario, accion, descripcion, ip_origen) 
        OUTPUT
            INSERTED.id_bitacora,
            INSERTED.id_usuario,
            INSERTED.accion,
            INSERTED.descripcion,
            INSERTED.fecha_hora,
            INSERTED.ip_origen,
        VALUES (@id_usuario, @accion, @descripcion, @ip_origen);
    `);

  console.log("Movimiento creado", result);
  return result.recordset[0] || null;
}
