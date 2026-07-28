import { WebSocketServer } from "ws";
import { handleMessage } from "./messageRouter.js";

export function initSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, request) => {
    console.log("Cliente conectado al WebSocket");

    ws.send(JSON.stringify({
      type: "connection",
      message: "Conexión establecida con el servidor WebSocket",
      success: true
    }));

    ws.on("message", async (data) => {
      try {
        console.log("IP Adress: ", request.socket.remoteAddress)
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        ws.send(JSON.stringify({
          type: "ERROR_FORMATO",
          success: false,
          message: "El mensaje enviado no tiene un formato JSON válido"
        }));
      }
    });

    ws.on("close", () => {
      console.log("Cliente desconectado");
    });
  });

  console.log("Servidor WebSocket inicializado");
}