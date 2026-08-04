import { getConnection, sql } from "../config/database.js";

export async function getUsers() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT
      id_usuario,
      rol,
      nombre,
      correo,
      activo,
      fecha_creacion
    FROM dbo.Usuario
    ORDER BY nombre, correo;
  `);

  return result.recordset || [];
}

export async function getUserByCorreo(correo) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("correo", sql.VarChar(150), correo)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Usuario
      WHERE correo = @correo;
    `);

  return result.recordset[0] || null;
}

export async function getUserById(idUsuario) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Usuario
      WHERE id_usuario = @id_usuario;
    `);

  return result.recordset[0] || null;
}

export async function createUser(user) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("rol", sql.VarChar(20), user.rol)
    .input("nombre", sql.VarChar(100), user.nombre)
    .input("correo", sql.VarChar(150), user.correo)
    .input("password_hash", sql.VarChar(255), user.password_hash)
    .query(`
      INSERT INTO dbo.Usuario (rol, nombre, correo, password_hash)
      OUTPUT
        INSERTED.id_usuario,
        INSERTED.rol,
        INSERTED.nombre,
        INSERTED.correo,
        INSERTED.activo,
        INSERTED.fecha_creacion
      VALUES (@rol, @nombre, @correo, @password_hash);
    `);

  return result.recordset[0] || null;
}

export async function registerFailedLogin(
  idUsuario,
  maxAttempts = 5,
  blockMinutes = 15,
) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .input("max_attempts", sql.Int, maxAttempts)
    .input("block_minutes", sql.Int, blockMinutes)
    .query(`
      UPDATE dbo.Usuario
      SET
        intentos_fallidos_login = intentos_fallidos_login + 1,
        bloqueado_hasta = CASE
          WHEN intentos_fallidos_login + 1 >= @max_attempts
            THEN DATEADD(MINUTE, @block_minutes, SYSDATETIME())
          ELSE bloqueado_hasta
        END
      OUTPUT
        INSERTED.intentos_fallidos_login,
        INSERTED.bloqueado_hasta
      WHERE id_usuario = @id_usuario;
    `);

  return result.recordset[0] || null;
}

export async function resetLoginAttempts(idUsuario) {
  const pool = await getConnection();
  await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .query(`
      UPDATE dbo.Usuario
      SET intentos_fallidos_login = 0,
          bloqueado_hasta = NULL
      WHERE id_usuario = @id_usuario;
    `);
}

export async function updatePassword(idUsuario, passwordHash) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .input("password_hash", sql.VarChar(255), passwordHash)
    .query(`
      UPDATE dbo.Usuario
      SET password_hash = @password_hash,
          intentos_fallidos_login = 0,
          bloqueado_hasta = NULL
      WHERE id_usuario = @id_usuario;
    `);

  return result.rowsAffected[0] > 0;
}
