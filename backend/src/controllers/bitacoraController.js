import { getMovimientosService, getMovimientosUsuarioService } from "../services/bitacoraService.js"
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/helpers.js";


export async function getMovimientosController({ type, payload, requestId }){
try {
    const allMovimientos = await getMovimientosService();

    return createSuccessResponse({
      type,
      requestId,
      message: "Todos los movimientos retornados satisfactoriamente",
      data: allMovimientos,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}

export async function getMovimientosUsuarioController({ type, payload, requestId }){
try {
    const movimientosXusuario = await getMovimientosUsuarioService(payload?.idUsuario);

    return createSuccessResponse({
      type,
      requestId,
      message: "Movimientos por usuario Obtenido",
      data: movimientosXusuario,
    });
  } catch (error) {
    return createErrorResponse({
      type,
      requestId,
      error,
    });
  }
}