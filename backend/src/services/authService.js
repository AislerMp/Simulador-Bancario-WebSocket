import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { createAuthError } from "../utils/authError.js";
import { generarCodigoMfa } from "./mfaService.js";

import {
  getUserByCorreo,
  createUser,
} from "../repositories/authRepositorie.js";

dotenv.config();

export async function login(correo, password) {
  if (!correo || !password) {
    throw createAuthError(
      "Correo y contraseña son obligatorios",
      "DATOS_INCOMPLETOS",
    );
  }

  const user = await getUserByCorreo(correo);

  if (!user) {
    throw createAuthError(
      "Correo o contraseña incorrectos",
      "CREDENCIALES_INVALIDAS",
    );
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw createAuthError(
      "Correo o contraseña incorrectos",
      "CREDENCIALES_INVALIDAS",
    );
  }

  if (user.activo === false || user.activo === 0) {
    throw createAuthError("El usuario está desactivado", "USUARIO_DESACTIVADO");
  }

  const mfaChallenge = await generarCodigoMfa(user.id_usuario);
  return mfaChallenge;
}

export async function register(user) {
  if (!user.nombre || !user.correo || !user.password) {
    throw createAuthError(
      "Todos los campos son obligatorios",
      "DATOS_INCOMPLETOS",
    );
  }

  const existingUser = await getUserByCorreo(user.correo);

  if (existingUser) {
    throw createAuthError(
      "El correo ya está registrado",
      "CORREO_YA_REGISTRADO",
    );
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(user.password, saltRounds);

  const newUser = {
    rol: "CLIENTE",
    nombre: user.nombre,
    correo: user.correo,
    password_hash: hashedPassword,
  };

  const createdUser = await createUser(newUser);

  return {
    user: createdUser,
  };
}
