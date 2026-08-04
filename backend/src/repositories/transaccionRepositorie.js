import { sql, createRequest } from "../config/database.js";

const TRANSACTION_SELECT = `
  SELECT
    t.*,
    co.numero_cuenta AS numero_cuenta_origen,
    cd.numero_cuenta AS numero_cuenta_destino,
    uo.nombre AS nombre_usuario_origen,
    ud.nombre AS nombre_usuario_destino
  FROM dbo.Transaccion AS t
  LEFT JOIN dbo.Cuenta_Bancaria AS co
    ON co.id_cuenta = t.id_cuenta_origen
  LEFT JOIN dbo.Cuenta_Bancaria AS cd
    ON cd.id_cuenta = t.id_cuenta_destino
  LEFT JOIN dbo.Usuario AS uo
    ON uo.id_usuario = co.id_usuario
  LEFT JOIN dbo.Usuario AS ud
    ON ud.id_usuario = cd.id_usuario
`;

export async function createTransaccion(transaccion, transaction = null) {
  const request = await createRequest(transaction);
  const result = await request
    .input("id_cuenta_origen", sql.Int, transaccion?.idCuentaOrigen ?? null)
    .input("id_cuenta_destino", sql.Int, transaccion?.idCuentaDestino ?? null)
    .input("tipo", sql.VarChar(20), transaccion.tipo)
    .input("monto", sql.Decimal(18, 2), transaccion.monto)
    .input("nombre_servicio", sql.VarChar(100), transaccion?.nombreServicio ?? null)
    .input("referencia_servicio", sql.VarChar(100), transaccion?.referenciaServicio ?? null)
    .input("referencia", sql.VarChar(50), transaccion.referencia)
    .input("mti", sql.Char(4), transaccion.mti)
    .input("codigo_respuesta", sql.Char(2), transaccion?.codigoRespuesta ?? null)
    .input("id_transaccion_original", sql.Int, transaccion?.idTransaccionOriginal ?? null)
    .query(`
      INSERT INTO dbo.Transaccion
      (
        id_cuenta_origen,
        id_cuenta_destino,
        tipo,
        monto,
        nombre_servicio,
        referencia_servicio,
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
        @nombre_servicio,
        @referencia_servicio,
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
      ${TRANSACTION_SELECT}
      WHERE t.id_transaccion = @id_transaccion;
    `);

  return result.recordset[0] || null;
}

export async function getTransaccionesByCuenta(idCuenta, transaction = null) {
  const request = await createRequest(transaction);
  const result = await request
    .input("id_cuenta", sql.Int, idCuenta)
    .query(`
      ${TRANSACTION_SELECT}
      WHERE t.id_cuenta_origen = @id_cuenta
         OR t.id_cuenta_destino = @id_cuenta
      ORDER BY t.fecha_hora DESC;
    `);

  return result.recordset || [];
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
      UPDATE dbo.Transaccion
      SET estado = @estado,
          codigo_respuesta = @codigo_respuesta
      WHERE id_transaccion = @id_transaccion;
    `);

  return result.rowsAffected[0] > 0;
}

export async function getReversionByOriginal(
  idTransaccionOriginal,
  transaction = null,
) {
  const request = await createRequest(transaction);
  const result = await request
    .input("id_transaccion_original", sql.Int, idTransaccionOriginal)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Transaccion
      WHERE id_transaccion_original = @id_transaccion_original
        AND tipo = 'REVERSION';
    `);

  return result.recordset[0] || null;
}
