export function createNewError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createSuccessResponse({ type, requestId, message, data = null }) {
  return {
    type,
    requestId: requestId ?? null,
    success: true,
    message,
    data,
    error: null,
  };
}

export function createErrorResponse({ type, requestId, error }) {
  const knownError = Boolean(error.code);

  if (!knownError) {
    console.error("Error interno:", error);
  }

  return {
    type,
    requestId: requestId ?? null,
    success: false,
    message: knownError
      ? error.message
      : "Ocurrió un error interno en el servidor",
    data: null,
    error: {
      code: error.code ?? "ERROR_INTERNO",
    },
  };
}