import env from "dotenv";
import express from "express";
import http from "http";
import { initSocketServer } from "./websocket/socketServer.js";
import { validateDatabaseSchema } from "./config/database.js";

env.config();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Servidor funcionando correctamente",
  });
});

async function startServer() {
  await validateDatabaseSchema();
  initSocketServer(server);

  server.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("No fue posible iniciar el backend:", error.message);
  process.exitCode = 1;
});
