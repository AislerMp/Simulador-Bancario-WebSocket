import { randomUUID } from "node:crypto";
import WebSocket from "ws";

const BACKEND_URL = process.env.BACKEND_WS_URL || "ws://localhost:3000";

const REQUEST_TIMEOUT = 10000;

// Conexión WebSocket actual.
let socket = null;

// Promesa utilizada cuando la conexión todavía se está abriendo.
let connectionPromise = null;

// Solicitudes enviadas que todavía esperan una respuesta.
const pendingRequests = new Map();

/**
 * Rechaza todas las solicitudes que estaban esperando respuesta.
 * Se utiliza cuando se pierde la conexión con el backend.
 */
function rejectPendingRequests(message) {
  for (const pendingRequest of pendingRequests.values()) {
    clearTimeout(pendingRequest.timeoutId);
    pendingRequest.reject(new Error(message));
  }

  pendingRequests.clear();
}

/**
 * Procesa todas las respuestas que llegan desde el backend.
 */
function handleMessage(data) {
  let response;

  try {
    response = JSON.parse(data.toString());
  } catch {
    console.error(
      "El backend envió una respuesta que no es un JSON válido",
    );
    return;
  }

  /*
   * El backend puede enviar mensajes generales como CONNECTION.
   * Si no tienen requestId, no pertenecen a una solicitud pendiente.
   */
  if (!response.requestId) {
    return;
  }

  const pendingRequest = pendingRequests.get(
    response.requestId,
  );

  if (!pendingRequest) {
    return;
  }

  clearTimeout(pendingRequest.timeoutId);
  pendingRequests.delete(response.requestId);

  pendingRequest.resolve(response);
}

/**
 * Abre la conexión solamente cuando sea necesario.
 *
 * Si ya está abierta, simplemente la reutiliza.
 */
async function connectSocket() {
  if (socket?.readyState === WebSocket.OPEN) {
    return;
  }

  /*
   * Si otra petición ya está abriendo la conexión,
   * esperamos esa misma promesa y no abrimos otra.
   */
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

      reject(
        new Error("No fue posible conectar con el backend"),
      );
    };

    const handleOpen = () => {
      newSocket.off("error", handleConnectionError);

      /*
       * Después de conectarse, los errores se registran.
       * Normalmente también serán seguidos por el evento close.
       */
      newSocket.on("error", (error) => {
        console.error(
          "Error en la conexión WebSocket:",
          error.message,
        );
      });

      connectionPromise = null;

      console.log(
        `Conexión WebSocket establecida con ${BACKEND_URL}`,
      );

      resolve();
    };

    newSocket.once("open", handleOpen);
    newSocket.once("error", handleConnectionError);

    newSocket.on("message", handleMessage);

    newSocket.on("close", () => {
      console.log(
        "La conexión WebSocket con el backend fue cerrada",
      );

      if (socket === newSocket) {
        socket = null;
      }

      connectionPromise = null;

      rejectPendingRequests(
        "Se perdió la conexión con el backend",
      );
    });
  });

  return connectionPromise;
}

/**
 * Envía una solicitud al backend y espera su respuesta.
 */
export async function sendSocketRequest(
  type,
  payload = {},
  token = null,
) {
  await connectSocket();

  const requestId = randomUUID();

  const message = {
    type,
    requestId,
    payload,
  };

  if (token) {
    message.token = token;
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);

      reject(
        new Error("El backend tardó demasiado en responder"),
      );
    }, REQUEST_TIMEOUT);

    /*
     * Guardamos quién está esperando la respuesta de este requestId.
     */
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

      reject(
        new Error(
          "No fue posible enviar la solicitud al backend",
        ),
      );
    }
  });
}

/**
 * Cierra manualmente la conexión.
 * Normalmente solo se utiliza cuando se apaga el frontend.
 */
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