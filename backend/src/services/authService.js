import bcrypt from "bcrypt";
import {
  getUserByCorreo,
  createUser,
  getUsers,
  registerFailedLogin,
  resetLoginAttempts,
} from "../repositories/authRepositorie.js";
import { createNewError } from "../utils/helpers.js";
import { generarCodigoMfa } from "./mfaService.js";
import { registrarEvento, BITACORA_ACCIONES } from "./bitacoraService.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_MINUTES = 15;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export async function login(correo, password) {
  const normalizedEmail = normalizeEmail(correo);

  if (!normalizedEmail || !password) {
    throw createNewError(
      "Correo y contraseña son obligatorios",
      "DATOS_INCOMPLETOS",
    );
  }

  const user = await getUserByCorreo(normalizedEmail);

  if (!user) {
    throw createNewError(
      "Correo o contraseña incorrectos",
      "CREDENCIALES_INVALIDAS",
    );
  }

  if (user.bloqueado_hasta) {
    const blockedUntil = new Date(user.bloqueado_hasta);

    if (blockedUntil > new Date()) {
      throw createNewError(
        "La cuenta está bloqueada temporalmente por varios intentos fallidos",
        "USUARIO_BLOQUEADO_TEMPORALMENTE",
      );
    }

    await resetLoginAttempts(user.id_usuario);
  }

  if (user.activo === false || user.activo === 0) {
    throw createNewError("El usuario está desactivado", "USUARIO_DESACTIVADO");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    const failure = await registerFailedLogin(
      user.id_usuario,
      MAX_LOGIN_ATTEMPTS,
      LOGIN_BLOCK_MINUTES,
    );

    if (failure?.bloqueado_hasta) {
      throw createNewError(
        "La cuenta fue bloqueada temporalmente por varios intentos fallidos",
        "USUARIO_BLOQUEADO_TEMPORALMENTE",
      );
    }

    throw createNewError(
      "Correo o contraseña incorrectos",
      "CREDENCIALES_INVALIDAS",
    );
  }

  await resetLoginAttempts(user.id_usuario);

  const mfaChallenge = await generarCodigoMfa(user.id_usuario);

  await registrarEvento({
    idUsuario: user.id_usuario,
    accion: BITACORA_ACCIONES.LOGIN,
    descripcion: "Inicio de sesión exitoso; código MFA generado.",
  });

  return mfaChallenge;
}

export async function register(user) {
  const nombre = String(user?.nombre || "").trim();
  const correo = normalizeEmail(user?.correo);
  const password = String(user?.password || "");

  if (!nombre || !correo || !password) {
    throw createNewError(
      "Todos los campos son obligatorios",
      "DATOS_INCOMPLETOS",
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw createNewError("El correo no tiene un formato válido", "CORREO_INVALIDO");
  }

  if (password.length < 8) {
    throw createNewError(
      "La contraseña debe tener al menos 8 caracteres",
      "PASSWORD_DEBIL",
    );
  }

  const existingUser = await getUserByCorreo(correo);

  if (existingUser) {
    throw createNewError(
      "El correo ya está registrado",
      "CORREO_YA_REGISTRADO",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const createdUser = await createUser({
    rol: "CLIENTE",
    nombre,
    correo,
    password_hash: hashedPassword,
  });

  await registrarEvento({
    idUsuario: createdUser.id_usuario,
    accion: BITACORA_ACCIONES.REGISTRO,
    descripcion: "Usuario registrado correctamente.",
  });

  return { user: createdUser };
}

export async function getUsuariosAdministrador(usuarioActual) {
  if (usuarioActual?.rol !== "ADMINISTRADOR") {
    throw createNewError(
      "No tiene permisos de administrador",
      "USUARIO_SIN_PERMISOS",
    );
  }

  const usuarios = await getUsers();
  return usuarios.filter(
    (usuario) => usuario.rol === "CLIENTE" && Boolean(usuario.activo),
  );
}
