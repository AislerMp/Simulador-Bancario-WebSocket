import env from "dotenv";
import sql from "mssql";

env.config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true"
  }
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
      process.env.DB_USER ? "con SQL Authentication" : "con Windows Authentication"
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

export { sql };