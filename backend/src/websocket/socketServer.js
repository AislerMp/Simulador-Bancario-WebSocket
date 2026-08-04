import { WebSocketServer } from "ws";
import { handleMessage } from "./messageRouter.js";

export function initSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    maxPayload: 64 * 1024,
    perMessageDeflate: false,
  });

  wss.on("connection", (ws, request) => {
    console.log("Cliente conectado al WebSocket", {
      ip: request.socket.remoteAddress,
    });

    ws.send(
      JSON.stringify({
        type: "connection",
        message: "Conexión establecida con el servidor WebSocket",
        success: true,
      }),
    );

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "ERROR_FORMATO",
            success: false,
            message: "El mensaje enviado no tiene un formato JSON válido",
            data: null,
            error: { code: "ERROR_FORMATO" },
          }),
        );
      }
    });

    ws.on("error", (error) => {
      console.error("Error de WebSocket:", error.message);
    });

    ws.on("close", () => {
      console.log("Cliente desconectado");
    });
  });

  console.log("Servidor WebSocket inicializado");
}
