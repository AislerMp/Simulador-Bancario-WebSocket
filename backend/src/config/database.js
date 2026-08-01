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
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeout: defaultTimeout,
  requestTimeout: defaultTimeout,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    connectTimeout: defaultTimeout,
    requestTimeout: defaultTimeout,
  },
};

let pool = null;

export async function getConnection() {
  try {
    if (pool) {
      return pool;
    }

    pool = await sql.connect(dbConfig);

    console.log(
      "Conexión a SQL Server establecida correctamente",
      process.env.DB_USER
        ? "con SQL Authentication"
        : "con Windows Authentication",
    );

    return pool;
  } catch (error) {
    console.error("Error al conectar con SQL Server:", error.message);
    throw error;
  }
}

export async function closeConnection() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log("Conexión a SQL Server cerrada correctamente");
    }
  } catch (error) {
    console.error("Error al cerrar la conexión:", error.message);
    throw error;
  }
}

export async function beginTransaction() {
  const pool = await getConnection();

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  return transaction;
}

export async function createRequest(transaction = null) {
  if (transaction) {
    return transaction.request();
  }

  const pool = await getConnection();

  return pool.request();
}

export { sql };
