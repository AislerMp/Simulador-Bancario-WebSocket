import env from "dotenv";
import sql from "mssql";

env.config();

const defaultTimeout = Number(
  process.env.DB_REQUEST_TIMEOUT_MS ??
    process.env.DB_CONNECTION_TIMEOUT_MS ??
    60000,
);

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeout: defaultTimeout,
  requestTimeout: defaultTimeout,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate:
      process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
  },
};

let pool = null;

export async function getConnection() {
  try {
    if (pool) return pool;

    if (!dbConfig.server) {
      throw new Error("Falta DB_SERVER en backend/.env");
    }

    if (!dbConfig.database) {
      throw new Error("Falta DB_NAME en backend/.env");
    }

    pool = await sql.connect(dbConfig);
    console.log("Conexión a SQL Server establecida correctamente");
    return pool;
  } catch (error) {
    console.error("Error al conectar con SQL Server:", error.message);
    throw error;
  }
}
export async function validateDatabaseSchema() {
  const connection = await getConnection();

  const result = await connection.request().query(`
    SELECT
      CASE
        WHEN COL_LENGTH(
          'dbo.Usuario',
          'intentos_fallidos_login'
        ) IS NOT NULL
        THEN 1
        ELSE 0
      END AS usuario_seguro,

      CASE
        WHEN COL_LENGTH(
          'dbo.Codigo_MFA',
          'intentos_fallidos'
        ) IS NOT NULL
        THEN 1
        ELSE 0
      END AS mfa_seguro,

      CASE
        WHEN OBJECT_ID(
          'dbo.Password_Reset',
          'U'
        ) IS NOT NULL
        THEN 1
        ELSE 0
      END AS password_reset,

      CASE
        WHEN EXISTS (
          SELECT 1
          FROM sys.check_constraints
          WHERE parent_object_id =
            OBJECT_ID(
              'dbo.Transaccion',
              'U'
            )
            AND name =
              'CK_Transaccion_Tipo'
        )
        THEN 1
        ELSE 0
      END AS transaccion_actualizada,

      CASE
        WHEN OBJECT_ID(
          'dbo.Solicitud_Cuenta',
          'U'
        ) IS NOT NULL
        AND COL_LENGTH(
          'dbo.Cuenta_Bancaria',
          'tipo_cuenta'
        ) IS NOT NULL
        THEN 1
        ELSE 0
      END AS solicitudes_cuenta;
  `);

  const status = result.recordset[0];

  console.log(
    "Validación del esquema:",
    status,
  );

  const ready = Object.values(
    status || {},
  ).every((value) => Number(value) === 1);

  if (!ready) {
    throw new Error(
      "La base de datos necesita la migración. " +
      "Revise las tablas y columnas requeridas.",
    );
  }

  console.log(
    "Esquema de base de datos actualizado",
  );
}

export async function closeConnection() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log("Conexión a SQL Server cerrada correctamente");
  }
}

export async function beginTransaction() {
  const connection = await getConnection();
  const transaction = new sql.Transaction(connection);
  await transaction.begin();
  return transaction;
}

export async function createRequest(transaction = null) {
  if (transaction) return transaction.request();
  const connection = await getConnection();
  return connection.request();
}

export { sql };
