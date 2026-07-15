import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { createNewError } from "../utils/reusableFunctions.js";
import { generarCodigoMfa } from "./mfaService.js";

import {
  getUserByCorreo,
  createUser,
} from "../repositories/authRepositorie.js";

dotenv.config();

export async function login(correo, password) {
  if (!correo || !password) {
    throw createNewError(
      "Correo y contraseña son obligatorios",
      "DATOS_INCOMPLETOS",
    );
  }

  const user = await getUserByCorreo(correo);

  if (!user) {
    throw createNewError(
      "Correo o contraseña incorrectos",
      "CREDENCIALES_INVALIDAS",
    );
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw createNewError(
      "Correo o contraseña incorrectos",
      "CREDENCIALES_INVALIDAS",
    );
  }

  if (user.activo === false || user.activo === 0) {
    throw createNewError("El usuario está desactivado", "USUARIO_DESACTIVADO");
  }

  const mfaChallenge = await generarCodigoMfa(user.id_usuario);
  return mfaChallenge;
}

export async function register(user) {
  if (!user.nombre || !user.correo || !user.password) {
    throw createNewError(
      "Todos los campos son obligatorios",
      "DATOS_INCOMPLETOS",
    );
  }

  const existingUser = await getUserByCorreo(user.correo);

  if (existingUser) {
    throw createNewError(
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
