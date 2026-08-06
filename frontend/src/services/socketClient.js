import { randomUUID } from "node:crypto";
import WebSocket from "ws";

const BACKEND_URL = process.env.BACKEND_WS_URL || "ws://localhost:3000";
const REQUEST_TIMEOUT = 10000;

let socket = null;
let connectionPromise = null;
const pendingRequests = new Map();

function rejectPendingRequests(message) {
  for (const pendingRequest of pendingRequests.values()) {
    clearTimeout(pendingRequest.timeoutId);
    pendingRequest.reject(new Error(message));
  }

  pendingRequests.clear();
}

function handleMessage(data) {
  let response;

  try {
    response = JSON.parse(data.toString());
  } catch {
    console.error("El backend envió una respuesta que no es un JSON válido");
    return;
  }

  if (!response.requestId) {
    return;
  }

  const pendingRequest = pendingRequests.get(response.requestId);

  if (!pendingRequest) {
    return;
  }

  clearTimeout(pendingRequest.timeoutId);
  pendingRequests.delete(response.requestId);
  pendingRequest.resolve(response);
}

async function connectSocket() {
  if (socket?.readyState === WebSocket.OPEN) {
    return;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    const newSocket = new WebSocket(BACKEND_URL);
    socket = newSocket;

    const handleConnectionError = () => {
      newSocket.off("open", handleOpen);

      if (socket === newSocket) {
        socket = null;
      }

      connectionPromise = null;
      reject(new Error("No fue posible conectar con el backend"));
    };

    const handleOpen = () => {
      newSocket.off("error", handleConnectionError);

      newSocket.on("error", (error) => {
        console.error("Error en la conexión WebSocket:", error.message);
      });

      connectionPromise = null;
      console.log(`Conexión WebSocket establecida con ${BACKEND_URL}`);
      resolve();
    };

    newSocket.once("open", handleOpen);
    newSocket.once("error", handleConnectionError);
    newSocket.on("message", handleMessage);

    newSocket.on("close", () => {
      console.log("La conexión WebSocket con el backend fue cerrada");

      if (socket === newSocket) {
        socket = null;
      }

      connectionPromise = null;
      rejectPendingRequests("Se perdió la conexión con el backend");
    });
  });

  return connectionPromise;
}

export async function sendSocketRequest(type, payload = {}, token = null) {
  await connectSocket();

  const requestId = randomUUID();
  const message = { type, requestId, payload };

  if (token) {
    message.token = token;
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("El backend tardó demasiado en responder"));
    }, REQUEST_TIMEOUT);

    pendingRequests.set(requestId, {
      resolve,
      reject,
      timeoutId,
    });

    try {
      socket.send(JSON.stringify(message));
    } catch {
      clearTimeout(timeoutId);
      pendingRequests.delete(requestId);
      reject(new Error("No fue posible enviar la solicitud al backend"));
    }
  });
}

export function closeSocketConnection() {
  if (
    socket?.readyState === WebSocket.OPEN ||
    socket?.readyState === WebSocket.CONNECTING
  ) {
    socket.close();
  }

  socket = null;
  connectionPromise = null;
}
