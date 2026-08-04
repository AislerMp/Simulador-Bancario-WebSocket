import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const mockGetUserByCorreo = jest.fn();
const mockCreateUser = jest.fn();
const mockGetUsers = jest.fn();
const mockRegisterFailedLogin = jest.fn();
const mockResetLoginAttempts = jest.fn();
const mockGenerarCodigoMfa = jest.fn();
const mockBcryptCompare = jest.fn();
const mockBcryptHash = jest.fn();
const mockRegistrarEvento = jest.fn();

jest.unstable_mockModule("../../src/repositories/authRepositorie.js", () => ({
  getUserByCorreo: mockGetUserByCorreo,
  createUser: mockCreateUser,
  getUsers: mockGetUsers,
  registerFailedLogin: mockRegisterFailedLogin,
  resetLoginAttempts: mockResetLoginAttempts,
}));

jest.unstable_mockModule("../../src/services/mfaService.js", () => ({
  generarCodigoMfa: mockGenerarCodigoMfa,
}));

jest.unstable_mockModule("../../src/services/bitacoraService.js", () => ({
  registrarEvento: mockRegistrarEvento,
  BITACORA_ACCIONES: {
    LOGIN: "LOGIN",
    REGISTRO: "REGISTRO",
  },
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}));

const { login, register } = await import("../../src/services/authService.js");

describe("authService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("rechaza credenciales incompletas", async () => {
    await expect(login("", "")).rejects.toMatchObject({
      code: "DATOS_INCOMPLETOS",
    });
  });

  test("registra un intento fallido cuando la contraseña no coincide", async () => {
    mockGetUserByCorreo.mockResolvedValue({
      id_usuario: 1,
      password_hash: "hash",
      activo: true,
      bloqueado_hasta: null,
    });
    mockBcryptCompare.mockResolvedValue(false);
    mockRegisterFailedLogin.mockResolvedValue({
      intentos_fallidos_login: 1,
      bloqueado_hasta: null,
    });

    await expect(login("cliente@test.com", "incorrecta")).rejects.toMatchObject({
      code: "CREDENCIALES_INVALIDAS",
    });

    expect(mockRegisterFailedLogin).toHaveBeenCalled();
  });

  test("genera MFA cuando el login es correcto", async () => {
    mockGetUserByCorreo.mockResolvedValue({
      id_usuario: 2,
      password_hash: "hash",
      activo: true,
      bloqueado_hasta: null,
    });
    mockBcryptCompare.mockResolvedValue(true);
    mockGenerarCodigoMfa.mockResolvedValue({ id_usuario: 2 });

    const result = await login("cliente@test.com", "Password1");

    expect(mockResetLoginAttempts).toHaveBeenCalledWith(2);
    expect(mockGenerarCodigoMfa).toHaveBeenCalledWith(2);
    expect(result).toEqual({ id_usuario: 2 });
  });

  test("el registro público siempre crea un CLIENTE", async () => {
    mockGetUserByCorreo.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("hash-seguro");
    mockCreateUser.mockResolvedValue({
      id_usuario: 3,
      rol: "CLIENTE",
      nombre: "Cliente",
      correo: "cliente@test.com",
    });

    const result = await register({
      nombre: "Cliente",
      correo: "cliente@test.com",
      password: "Password1",
      rol: "ADMINISTRADOR",
    });

    expect(mockCreateUser).toHaveBeenCalledWith({
      rol: "CLIENTE",
      nombre: "Cliente",
      correo: "cliente@test.com",
      password_hash: "hash-seguro",
    });
    expect(result.user.rol).toBe("CLIENTE");
  });
});
