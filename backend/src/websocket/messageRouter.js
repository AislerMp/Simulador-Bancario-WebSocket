import * as authController from "../controllers/authController.js";
import * as cuentaController from "../controllers/cuentaBancariaController.js";

const handlers = {
  /* ESTE SON LOS CONTROLLER DE LAS AUTENTICACIONES */
  LOGIN: authController.loginController,
  REGISTER: authController.registerController,
  VERIFY_MFA: authController.verifyMfaController,

  /* ESTE SON LOS CONTROLLER DE LAS CUENTAS BANCARIAS */
  CREATE_CUENTA: cuentaController.createCuenta,
  GET_CUENTA: cuentaController.getCuentaBancaria,
  GET_CUENTAS_USUARIO: cuentaController.getCuentasBancariasUsuario,
  UPDATE_ESTADO_CUENTA: cuentaController.changeEstadoCuenta,
};

export async function handleMessage(ws, message) {
  console.log("Mensaje recibido del frontend:", message);
  let response;

  const handler = handlers[message.type];

  if (!handler) {
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
  }

  response = await handler(message);

  console.log("Enviando respuesta desde el backend:", response);
  ws.send(JSON.stringify(response));
}