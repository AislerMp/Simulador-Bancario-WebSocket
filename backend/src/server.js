import env from "dotenv";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { initSocketServer } from './websocket/socketServer.js';
env.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Permite recibir JSON en rutas HTTP si luego las usamos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir el frontend desde la carpeta frontend
app.use(express.static(path.join(__dirname, "../../frontend")));

// Ruta simple para probar que Express funciona
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Servidor funcionando correctamente"
  });
});

initSocketServer(server);

server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});