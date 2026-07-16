import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSessionMiddleware } from "./config/session.js";
import webRoutes from "./routes/webRoutes.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Permite leer los datos enviados por formularios HTML.
app.use(express.urlencoded({ extended: false }));

// Sirve únicamente CSS, imágenes y otros recursos públicos.
app.use(express.static(path.join(__dirname, "../public")));

// Agrega req.session a cada solicitud HTTP.
app.use(createSessionMiddleware());

app.use(webRoutes);

app.use((_req, res) => {
  return res.status(404).render("pages/not-found", {
    title: "Página no encontrada",
    message: null,
    messageType: "error",
    values: {},
    user: null,
    mfa: null,
    showLogout: false,
  });
});

app.use((error, _req, res, _next) => {
  console.error("Error no controlado en el frontend:", error);

  return res.status(500).render("pages/error", {
    title: "Error interno",
    message: "Ocurrió un error inesperado en el frontend",
    messageType: "error",
    values: {},
    user: null,
    mfa: null,
    showLogout: false,
  });
});

app.listen(PORT, () => {
  console.log(`Frontend EJS: http://localhost:${PORT}`);
  console.log(
    `Backend WebSocket: ${process.env.BACKEND_WS_URL || "ws://localhost:3000"}`,
  );
});
