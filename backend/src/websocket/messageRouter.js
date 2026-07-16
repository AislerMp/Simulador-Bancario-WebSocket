import {
  registerController,
  loginController,
  verifyMfaController,
} from "../controllers/authController.js";

export async function handleMessage(ws, message) {
  console.log("Mensaje recibido del frontend:", message);
  let response;

  switch (message.type) {
    case "PING":
      response = {
        type: "PONG",
        requestId: message.requestId ?? null,
        success: true,
        message: "Servidor activo",
        data: null,
        error: null,
      };
      break;

    case "REGISTER":
      response = await registerController(message);
      break;

    case "LOGIN":
      response = await loginController(message);
      break;

    case "VERIFY_MFA":
      response = await verifyMfaController(message);
      break;

    default:
      response = {
        type: "TIPO_NO_SOPORTADO",
        requestId: message.requestId ?? null,
        success: false,
        message: `El tipo de mensaje '${message.type}' no está soportado`,
        data: null,
        error: {
          code: "TIPO_NO_SOPORTADO",
        },
      };
      break;
  }
  console.log("Enviando respuesta desde el backend:", response);
  ws.send(JSON.stringify(response));
}
