import { getConnection, sql, createRequest } from "../config/database.js";

export async function createTransaccion(transaccion, transaction = null) {
  const request = await createRequest(transaction);

  const result = await request
    .input("id_cuenta_origen", sql.Int, transaccion.idCuentaOrigen)
    .input("id_cuenta_destino", sql.Int, transaccion.idCuentaDestino)
    .input("tipo", sql.VarChar(20), transaccion.tipo)
    .input("monto", sql.Decimal(18, 2), transaccion.monto)
    .input("referencia", sql.VarChar(50), transaccion.referencia)
    .input("mti", sql.Char(4), transaccion.mti)
    .input("codigo_respuesta", sql.Char(2), transaccion.codigoRespuesta)
    .input(
      "id_transaccion_original",
      sql.Int,
      transaccion.idTransaccionOriginal,
    ).query(`
        INSERT INTO Transaccion
        (
            id_cuenta_origen,
            id_cuenta_destino,
            tipo,
            monto,
            referencia,
            mti,
            codigo_respuesta,
            id_transaccion_original
        )

        OUTPUT INSERTED.*

        VALUES
        (
            @id_cuenta_origen,
            @id_cuenta_destino,
            @tipo,
            @monto,
            @referencia,
            @mti,
            @codigo_respuesta,
            @id_transaccion_original
        );
    `);

  return result.recordset[0] || null;
}

export async function getTransaccionById(idTransaccion, transaction = null) {
  const request = await createRequest(transaction);

  const result = await request
    .input("id_transaccion", sql.Int, idTransaccion)
    .query(`
        SELECT TOP 1 *
        FROM Transaccion
        WHERE id_transaccion = @id_transaccion;
    `);

  return result.recordset[0] || null;
}

export async function getTransaccionByReferencia(referencia, transaction = null) {
  const request = await createRequest(transaction);

  const result = await request
    .input("referencia", sql.VarChar(50), referencia)
    .query(`
        SELECT TOP 1 *
        FROM Transaccion
        WHERE referencia = @referencia;
    `);

  return result.recordset[0] || null;
}

export async function getTransaccionesCuenta(idCuenta, transaction = null) {
  const request = await createRequest(transaction);

  const result = await request
    .input("id_cuenta", sql.Int, idCuenta)
    .query(`
        SELECT *
        FROM Transaccion
        WHERE
            id_cuenta_origen = @id_cuenta
            OR id_cuenta_destino = @id_cuenta
        ORDER BY fecha_hora DESC;
    `);

  return result.recordset;
}

export async function updateEstadoTransaccion(
  idTransaccion,
  estado,
  codigoRespuesta = null,
  transaction = null,
) {
  const request = await createRequest(transaction);

  const result = await request
    .input("id_transaccion", sql.Int, idTransaccion)
    .input("estado", sql.VarChar(20), estado)
    .input("codigo_respuesta", sql.Char(2), codigoRespuesta)
    .query(`
        UPDATE Transaccion
        SET
            estado = @estado,
            codigo_respuesta = @codigo_respuesta
        WHERE id_transaccion = @id_transaccion;
    `);

  return result.rowsAffected[0] > 0;
}

export async function getTransaccionOriginal(
  idTransaccionOriginal,
  transaction = null,
) {
  const request = await createRequest(transaction);

  const result = await request
    .input("id_transaccion_original", sql.Int, idTransaccionOriginal)
    .query(`
        SELECT TOP 1 *
        FROM Transaccion
        WHERE id_transaccion = @id_transaccion_original;
    `);

  return result.recordset[0] || null;
}