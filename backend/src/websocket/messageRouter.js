import { registerController, loginController, verifyMfaController } from "../controllers/authController.js";

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
    case "REGISTER":
      const registerResponse = await registerController(message);
      ws.send(JSON.stringify(registerResponse));
      break;
    case "LOGIN":
      const loginResponse = await loginController(message);
      ws.send(JSON.stringify(loginResponse));
      break;
    case "VERIFY_MFA":
      const verifyMfaResponse = await verifyMfaController(message);
      ws.send(JSON.stringify(verifyMfaResponse));
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