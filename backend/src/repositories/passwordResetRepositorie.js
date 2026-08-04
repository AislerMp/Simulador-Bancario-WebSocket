import { getConnection, sql } from "../config/database.js";

export async function invalidatePendingResetCodes(idUsuario) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .query(`
      UPDATE dbo.Password_Reset
      SET utilizado = 1
      WHERE id_usuario = @id_usuario
        AND utilizado = 0;
    `);

  return result.rowsAffected[0];
}

export async function createPasswordResetCode({
  idUsuario,
  codigoHash,
  fechaExpiracion,
}) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .input("codigo_hash", sql.VarChar(255), codigoHash)
    .input("fecha_expiracion", sql.DateTime2, fechaExpiracion)
    .query(`
      INSERT INTO dbo.Password_Reset
        (id_usuario, codigo_hash, fecha_expiracion)
      OUTPUT INSERTED.*
      VALUES (@id_usuario, @codigo_hash, @fecha_expiracion);
    `);

  return result.recordset[0] || null;
}

export async function getValidPasswordResetCode(idUsuario) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Password_Reset
      WHERE id_usuario = @id_usuario
        AND utilizado = 0
        AND fecha_expiracion > SYSDATETIME()
      ORDER BY fecha_creacion DESC;
    `);

  return result.recordset[0] || null;
}

export async function markPasswordResetAsUsed(idPasswordReset) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_password_reset", sql.Int, idPasswordReset)
    .query(`
      UPDATE dbo.Password_Reset
      SET utilizado = 1
      WHERE id_password_reset = @id_password_reset
        AND utilizado = 0;
    `);

  return result.rowsAffected[0] > 0;
}

export async function registerInvalidPasswordResetAttempt(
  idPasswordReset,
  maxAttempts = 5,
) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_password_reset", sql.Int, idPasswordReset)
    .input("max_attempts", sql.Int, maxAttempts)
    .query(`
      UPDATE dbo.Password_Reset
      SET
        intentos_fallidos = intentos_fallidos + 1,
        utilizado = CASE
          WHEN intentos_fallidos + 1 >= @max_attempts THEN 1
          ELSE utilizado
        END
      OUTPUT
        INSERTED.intentos_fallidos,
        INSERTED.utilizado
      WHERE id_password_reset = @id_password_reset
        AND utilizado = 0;
    `);

  return result.recordset[0] || null;
}
