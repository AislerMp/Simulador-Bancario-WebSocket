import { getConnection, sql } from "../config/database.js";

export async function createCodigoMfaCode({
  idUsuario,
  codigoMfahash,
  fechaExpiracion,
}) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .input("codigo_hash", sql.VarChar(255), codigoMfahash)
    .input("fecha_expiracion", sql.DateTime2, fechaExpiracion)
    .query(`
      INSERT INTO dbo.Codigo_MFA
        (id_usuario, codigo_hash, fecha_expiracion)
      OUTPUT
        INSERTED.id_codigo_mfa,
        INSERTED.id_usuario,
        INSERTED.fecha_creacion,
        INSERTED.fecha_expiracion,
        INSERTED.utilizado,
        INSERTED.intentos_fallidos
      VALUES (@id_usuario, @codigo_hash, @fecha_expiracion);
    `);

  return result.recordset[0] || null;
}

export async function invalidatePendingCodesByUserId(idUsuario) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .query(`
      UPDATE dbo.Codigo_MFA
      SET utilizado = 1
      WHERE id_usuario = @id_usuario
        AND utilizado = 0;
    `);

  return result.rowsAffected[0];
}

export async function getValidMfaChallenge(idUsuario) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Codigo_MFA
      WHERE id_usuario = @id_usuario
        AND utilizado = 0
        AND fecha_expiracion > SYSDATETIME()
      ORDER BY fecha_creacion DESC;
    `);

  return result.recordset[0] || null;
}

export async function markMfaCodeAsUsed(idCodigoMfa) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_codigo_mfa", sql.Int, idCodigoMfa)
    .query(`
      UPDATE dbo.Codigo_MFA
      SET utilizado = 1
      WHERE id_codigo_mfa = @id_codigo_mfa
        AND utilizado = 0;
    `);

  return result.rowsAffected[0] > 0;
}

export async function registerInvalidMfaAttempt(
  idCodigoMfa,
  maxAttempts = 5,
) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_codigo_mfa", sql.Int, idCodigoMfa)
    .input("max_attempts", sql.Int, maxAttempts)
    .query(`
      UPDATE dbo.Codigo_MFA
      SET
        intentos_fallidos = intentos_fallidos + 1,
        utilizado = CASE
          WHEN intentos_fallidos + 1 >= @max_attempts THEN 1
          ELSE utilizado
        END
      OUTPUT
        INSERTED.intentos_fallidos,
        INSERTED.utilizado
      WHERE id_codigo_mfa = @id_codigo_mfa
        AND utilizado = 0;
    `);

  return result.recordset[0] || null;
}
