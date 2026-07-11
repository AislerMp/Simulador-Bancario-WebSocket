export async function handleMessage(ws, message) {
  console.log("Mensaje recibido:", message);

  switch (message.type) {
    case "PING":
      ws.send(JSON.stringify({
        type: "PONG",
        success: true,
        message: "Respuesta desde el servidor"
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: "TIPO_NO_SOPORTADO",
        success: false,
        message: `El tipo de mensaje '${message.type}' no existe`
      }));
      break;
  }
}