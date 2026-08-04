import { getConnection, sql, createRequest } from "../config/database.js";

export async function createCuentaBancaria(
  idUsuario,
  numeroCuenta,
  tipoCuenta = "AHORROS",
  transaction = null,
) {
  const request = await createRequest(transaction);

  const result = await request
    .input("id_usuario", sql.Int, idUsuario)
    .input(
      "numero_cuenta",
      sql.VarChar(25),
      numeroCuenta,
    )
    .input(
      "tipo_cuenta",
      sql.VarChar(20),
      tipoCuenta,
    )
    .query(`
      INSERT INTO dbo.Cuenta_Bancaria (
        id_usuario,
        numero_cuenta,
        tipo_cuenta
      )
      OUTPUT INSERTED.*
      VALUES (
        @id_usuario,
        @numero_cuenta,
        @tipo_cuenta
      );
    `);

  return result.recordset[0] || null;
}

export async function getCuentaByNumero(
  numeroCuenta,
  transaction = null,
) {
  const request = await createRequest(transaction);

  const result = await request
    .input(
      "numero_cuenta",
      sql.VarChar(25),
      numeroCuenta,
    )
    .query(`
      SELECT TOP 1
        c.*,
        u.nombre AS nombre_usuario,
        u.correo AS correo_usuario
      FROM dbo.Cuenta_Bancaria AS c
      INNER JOIN dbo.Usuario AS u
        ON u.id_usuario = c.id_usuario
      WHERE c.numero_cuenta = @numero_cuenta;
    `);

  return result.recordset[0] || null;
}

export async function getCuentasByUser(idUsuario) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_usuario", sql.Int, idUsuario)
    .query(`
      SELECT *
      FROM dbo.Cuenta_Bancaria
      WHERE id_usuario = @id_usuario
      ORDER BY fecha_creacion DESC;
    `);

  return result.recordset || [];
}

export async function getCuentaById(idCuenta, transaction = null) {
  const request = await createRequest(transaction);
  const result = await request
    .input("id_cuenta", sql.Int, idCuenta)
    .query(`
      SELECT TOP 1
        c.*,
        u.nombre AS nombre_usuario,
        u.correo AS correo_usuario
      FROM dbo.Cuenta_Bancaria AS c
      INNER JOIN dbo.Usuario AS u
        ON u.id_usuario = c.id_usuario
      WHERE c.id_cuenta = @id_cuenta;
    `);

  return result.recordset[0] || null;
}

export async function updateEstadoCuenta(idCuenta, idUsuario, estado) {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input("id_cuenta", sql.Int, idCuenta)
    .input("id_usuario", sql.Int, idUsuario)
    .input("estado", sql.VarChar(15), estado)
    .query(`
      UPDATE dbo.Cuenta_Bancaria
      SET estado = @estado
      WHERE id_cuenta = @id_cuenta
        AND id_usuario = @id_usuario;
    `);

  return result.rowsAffected[0] > 0;
}

export async function updateSaldoCuenta(
  idCuenta,
  monto,
  operacion,
  transaction = null,
) {
  if (!["+", "-"].includes(operacion)) {
    throw new Error("La operación de actualización de saldo no es válida");
  }

  const request = await createRequest(transaction);
  const condicionSaldo =
    operacion === "-" ? "AND saldo_actual >= @monto" : "";

  const result = await request
    .input("id_cuenta", sql.Int, idCuenta)
    .input("monto", sql.Decimal(18, 2), monto)
    .query(`
      UPDATE dbo.Cuenta_Bancaria
      SET saldo_actual = saldo_actual ${operacion} @monto
      WHERE id_cuenta = @id_cuenta
      ${condicionSaldo};
    `);

  return result.rowsAffected[0] > 0;
}

export async function getTodasCuentas() {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT
      c.id_cuenta,
      c.id_usuario,
      c.numero_cuenta,
      c.saldo_actual,
      c.estado,
      c.fecha_creacion,
      c.tipo_cuenta,
      u.nombre AS nombre_usuario,
      u.correo AS correo_usuario
    FROM dbo.Cuenta_Bancaria AS c
    INNER JOIN dbo.Usuario AS u
      ON u.id_usuario = c.id_usuario
    ORDER BY u.nombre, c.numero_cuenta;
  `);

  return result.recordset || [];
}
