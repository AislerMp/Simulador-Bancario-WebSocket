export function createAuthError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}