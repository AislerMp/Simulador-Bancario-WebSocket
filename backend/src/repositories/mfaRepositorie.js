import { getConnection, sql } from "../config/database.js";

export async function createCodigoMfaCode({ idUsuario, codigoMfahash, fechaExpiracion }) {
    const pool = await getConnection();

    const result = await pool.request()
        .input("id_usuario", sql.Int, idUsuario)
        .input("codigo_hash", sql.VarChar, codigoMfahash)
        .input("fecha_expiracion", sql.DateTime2, fechaExpiracion)
        .query(`
            INSERT INTO Codigo_MFA (id_usuario, codigo_hash, fecha_expiracion)
            OUTPUT
                INSERTED.id_codigo_mfa,
                INSERTED.id_usuario,
                INSERTED.fecha_creacion,
                INSERTED.fecha_expiracion,
                INSERTED.utilizado
            VALUES (@id_usuario, @codigo_hash, @fecha_expiracion);
        `);

    return result.recordset[0] || null;
}

export async function invalidatePendingCodesByUserId(idUsuario) {
    const pool = await getConnection();
    const result = await pool.request()
        .input("id_usuario", sql.Int, idUsuario)
        .query(`
            UPDATE Codigo_MFA
            SET utilizado = 1
            WHERE id_usuario = @id_usuario AND utilizado = 0;
        `);
    return result.rowsAffected[0];
}

/**
 * Busca un desafío MFA válido.
 *
 * Debe:
 * - pertenecer al usuario;
 * - no haber sido utilizado;
 * - no estar vencido.
 */
export async function getValidMfaChallenge(idUsuario){
    const pool = await getConnection();
    const result = await pool.request()
        .input("id_usuario", sql.Int, idUsuario)
        .query(`
            SELECT TOP 1 *
            FROM Codigo_MFA
            WHERE id_usuario = @id_usuario AND utilizado = 0 AND fecha_expiracion > SYSDATETIME()
            ORDER BY fecha_expiracion DESC;
        `);
    return result.recordset[0] || null; 
}

/**
 * Marca el código como utilizado.
 * Una vez utilizado, no podrá volver a validarse.
 */

export async function markMfaCodeAsUsed(idCodigoMfa) {
    const pool = await getConnection();
    const result = await pool.request()
        .input("id_codigo_mfa", sql.Int, idCodigoMfa)
        .query(`
            UPDATE Codigo_MFA
            SET utilizado = 1
            WHERE id_codigo_mfa = @id_codigo_mfa AND fecha_expiracion > SYSDATETIME() AND utilizado = 0;
        `);
    return result.rowsAffected[0] > 0; 
}