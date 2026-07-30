import jwt from "jsonwebtoken";
import { createNewError } from "./helpers.js";
import env from "dotenv";
env.config();

export function verifyToken(token) {
  if (!token) {
    throw createNewError("Token requerido", "TOKEN_REQUERIDO");
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw createNewError("Token inválido o expirado", "TOKEN_INVALIDO");
  }
}
