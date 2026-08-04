import * as authController from "../controllers/authController.js";
import * as cuentaController from "../controllers/cuentaBancariaController.js";
import * as bitacoraController from "../controllers/bitacoraController.js";
import * as transaccionController from "../controllers/transferenciaController.js";
import { verifyToken } from "../utils/jwt.js";
import { createErrorResponse, createNewError } from "../utils/helpers.js";
import * as solicitudCuentaController from "../controllers/solicitudCuentaController.js";

const handlers = {
  LOGIN: authController.loginController,
  REGISTER: authController.registerController,
  VERIFY_MFA: authController.verifyMfaController,
  REQUEST_PASSWORD_RESET: authController.requestPasswordResetController,
  RESET_PASSWORD: authController.resetPasswordController,
  GET_USUARIOS: authController.getUsuariosController,

  CREATE_CUENTA: cuentaController.createCuenta,
  GET_CUENTA: cuentaController.getCuentaBancaria,
  GET_CUENTA_POR_NUMERO: cuentaController.getCuentaPorNumeroController,
  GET_CUENTAS_USUARIO: cuentaController.getCuentasBancariasUsuario,
  GET_TODAS_CUENTAS: cuentaController.getTodasCuentasController,
  UPDATE_ESTADO_CUENTA: cuentaController.changeEstadoCuenta,

  GET_MOVIMIENTOS: bitacoraController.getMovimientosController,
  GET_MOVIMIENTOSXUSUARIO:bitacoraController.getMovimientosUsuarioController,
  DEPOSITO_EFECTIVO: transaccionController.depositoEfectivoController,
  RETIRO_EFECTIVO: transaccionController.retiroEfectivoController,
  TRANSFERENCIA: transaccionController.transferenciaController,
  PAGO_SERVICIO: transaccionController.pagoServicioController,
  GET_TRANSACCIONES_CUENTA:transaccionController.movimientosTransaccionController,
  REVERTIR_TRANSACCION: transaccionController.reversionController,
  SOLICITAR_CUENTA:solicitudCuentaController.solicitarCuentaController,
  GET_MIS_SOLICITUDES:solicitudCuentaController.getMisSolicitudesController,
  GET_SOLICITUDES_PENDIENTES:solicitudCuentaController.getSolicitudesPendientesController,
  APROBAR_SOLICITUD_CUENTA:solicitudCuentaController.aprobarSolicitudController,
  RECHAZAR_SOLICITUD_CUENTA:solicitudCuentaController.rechazarSolicitudController,
};

const PUBLIC_OPERATIONS = new Set([
  "LOGIN",
  "REGISTER",
  "VERIFY_MFA",
  "REQUEST_PASSWORD_RESET",
  "RESET_PASSWORD",
]);

function safeMessageLog(message) {
  const payload = { ...(message?.payload || {}) };

  for (const key of [
    "password",
    "confirmacion",
    "codigoMfa",
    "codigo",
    "nuevaPassword",
  ]) {
    if (payload[key] !== undefined) {
      payload[key] = "[OCULTO]";
    }
  }

  return {
    type: message?.type,
    requestId: message?.requestId,
    payload,
    token: message?.token ? "[TOKEN RECIBIDO]" : undefined,
  };
}

export async function handleMessage(ws, message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    const response = createErrorResponse({
      type: "ERROR_FORMATO",
      requestId: null,
      error: createNewError(
        "El mensaje debe ser un objeto JSON",
        "MENSAJE_INVALIDO",
      ),
    });
    ws.send(JSON.stringify(response));
    return;
  }

  const handler = handlers[message.type];

  if (!handler) {
    ws.send(
      JSON.stringify({
        type: "TIPO_NO_SOPORTADO",
        requestId: message.requestId ?? null,
        success: false,
        message: "La operación solicitada no está soportada",
        data: null,
        error: { code: "TIPO_NO_SOPORTADO" },
      }),
    );
    return;
  }

  console.log("Mensaje recibido:", safeMessageLog(message));

  try {
    if (!PUBLIC_OPERATIONS.has(message.type)) {
      message.userToken = verifyToken(message.token);
    }
  } catch (error) {
    ws.send(
      JSON.stringify(
        createErrorResponse({
          type: message.type,
          requestId: message.requestId,
          error,
        }),
      ),
    );
    return;
  }

  try {
    const response = await handler(message);

    console.log("Respuesta enviada:", {
      type: response.type,
      requestId: response.requestId,
      success: response.success,
      token: response.data?.token ? "[TOKEN GENERADO]" : undefined,
    });

    ws.send(JSON.stringify(response));
  } catch (error) {
    const response = createErrorResponse({
      type: message.type,
      requestId: message.requestId,
      error,
    });
    ws.send(JSON.stringify(response));
  }
}
