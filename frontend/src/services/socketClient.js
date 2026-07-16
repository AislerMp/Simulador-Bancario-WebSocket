import { randomUUID } from "node:crypto";
import WebSocket from "ws";

const REQUEST_TIMEOUT_MS = 10000;

function getBackendUrl() {
  return process.env.BACKEND_WS_URL || "ws://localhost:3000";
}

/**
 * Envía una solicitud al backend mediante WebSocket.
 *
 * Para mantener esta versión sencilla, cada formulario abre una conexión,
 * envía un mensaje, espera la respuesta correspondiente y cierra la conexión.
 */
export function sendSocketRequest(type, payload = {}, token = null) {
  if (!type) {
    return Promise.reject(
      new Error("Debe indicarse el tipo de mensaje WebSocket"),
    );
  }

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(getBackendUrl());
    const requestId = randomUUID();
    let completed = false;

    const finish = (callback, value) => {
      if (completed) return;

      completed = true;
      clearTimeout(timeoutId);

      callback(value);

      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.terminate();
      }
    };

    const timeoutId = setTimeout(() => {
      finish(
        reject,
        new Error("El backend tardó demasiado en responder"),
      );
    }, REQUEST_TIMEOUT_MS);

    socket.on("open", () => {
      const message = {
        type,
        requestId,
        payload,
      };

      if (token) {
        message.token = token;
      }

      socket.send(JSON.stringify(message));
    });

    socket.on("message", (data) => {
      try {
        const response = JSON.parse(data.toString());

        // El backend envía primero un mensaje CONNECTION sin requestId.
        // Lo ignoramos y esperamos la respuesta de nuestra solicitud.
        if (response.requestId !== requestId) {
          return;
        }

        finish(resolve, response);
      } catch {
        finish(
          reject,
          new Error("El backend devolvió una respuesta inválida"),
        );
      }
    });

    socket.on("error", () => {
      finish(
        reject,
        new Error("No fue posible conectar con el backend"),
      );
    });

    socket.on("close", () => {
      if (!completed) {
        finish(
          reject,
          new Error(
            "La conexión con el backend se cerró inesperadamente",
          ),
        );
      }
    });
  });
}
