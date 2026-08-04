import {
  getMovimientosService,
  getMovimientosUsuarioService,
} from "../services/bitacoraService.js";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/helpers.js";

export async function getMovimientosController({
  type,
  requestId,
  userToken,
}) {
  try {
    const data = await getMovimientosService(userToken);
    return createSuccessResponse({
      type,
      requestId,
      message: "Movimientos obtenidos correctamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}

export async function getMovimientosUsuarioController({
  type,
  payload,
  requestId,
  userToken,
}) {
  try {
    const requestedUserId =
      userToken?.rol === "ADMINISTRADOR"
        ? Number(payload?.idUsuario)
        : Number(userToken?.idUsuario);

    const data = await getMovimientosUsuarioService(
      requestedUserId,
      userToken,
    );

    return createSuccessResponse({
      type,
      requestId,
      message: "Movimientos del usuario obtenidos correctamente",
      data,
    });
  } catch (error) {
    return createErrorResponse({ type, requestId, error });
  }
}
