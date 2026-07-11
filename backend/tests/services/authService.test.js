import {
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

const mockGetUserByCorreo = jest.fn();
const mockCreateUser = jest.fn();
const mockGenerarCodigoMfa = jest.fn();

const mockBcryptCompare = jest.fn();
const mockBcryptHash = jest.fn();

jest.unstable_mockModule(
  "../../src/repositories/authRepositorie.js",
  () => ({
    getUserByCorreo: mockGetUserByCorreo,
    createUser: mockCreateUser,
  }),
);

jest.unstable_mockModule("../../src/services/mfaService.js", () => ({
  generarCodigoMfa: mockGenerarCodigoMfa,
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}));

const { login, register } = await import(
  "../../src/services/authService.js"
);

describe("authService - login", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("lanza error cuando faltan correo o contraseña", async () => {
    await expect(login("", "")).rejects.toMatchObject({
      message: "Correo y contraseña son obligatorios",
      code: "DATOS_INCOMPLETOS",
    });
  });

  test("lanza error cuando el usuario no existe", async () => {
    mockGetUserByCorreo.mockResolvedValue(null);

    await expect(
      login("noexiste@test.com", "123456"),
    ).rejects.toMatchObject({
      message: "Correo o contraseña incorrectos",
      code: "CREDENCIALES_INVALIDAS",
    });

    expect(mockBcryptCompare).not.toHaveBeenCalled();
    expect(mockGenerarCodigoMfa).not.toHaveBeenCalled();
  });

  test("lanza error cuando la contraseña es incorrecta", async () => {
    mockGetUserByCorreo.mockResolvedValue({
      id_usuario: 1,
      correo: "cliente@test.com",
      password_hash: "hash-guardado",
      activo: true,
    });

    mockBcryptCompare.mockResolvedValue(false);

    await expect(
      login("cliente@test.com", "incorrecta"),
    ).rejects.toMatchObject({
      code: "CREDENCIALES_INVALIDAS",
    });

    expect(mockBcryptCompare).toHaveBeenCalledWith(
      "incorrecta",
      "hash-guardado",
    );

    expect(mockGenerarCodigoMfa).not.toHaveBeenCalled();
  });

  test("lanza error cuando el usuario está desactivado", async () => {
    mockGetUserByCorreo.mockResolvedValue({
      id_usuario: 2,
      correo: "inactivo@test.com",
      password_hash: "hash-guardado",
      activo: 0,
    });

    mockBcryptCompare.mockResolvedValue(true);

    await expect(
      login("inactivo@test.com", "123456"),
    ).rejects.toMatchObject({
      message: "El usuario está desactivado",
      code: "USUARIO_DESACTIVADO",
    });

    expect(mockGenerarCodigoMfa).not.toHaveBeenCalled();
  });

  test("genera el desafío MFA cuando las credenciales son válidas", async () => {
    const usuario = {
      id_usuario: 5,
      rol: "CLIENTE",
      nombre: "Aisler",
      correo: "aisler@test.com",
      password_hash: "hash-guardado",
      activo: true,
    };

    const challenge = {
      id_codigo_mfa: 20,
      id_usuario: 5,
      fecha_expiracion: new Date("2026-07-10T20:05:00Z"),
      utilizado: false,
    };

    mockGetUserByCorreo.mockResolvedValue(usuario);
    mockBcryptCompare.mockResolvedValue(true);
    mockGenerarCodigoMfa.mockResolvedValue(challenge);

    const result = await login(
      "aisler@test.com",
      "password-correcta",
    );

    expect(mockGetUserByCorreo).toHaveBeenCalledWith(
      "aisler@test.com",
    );

    expect(mockBcryptCompare).toHaveBeenCalledWith(
      "password-correcta",
      "hash-guardado",
    );

    expect(mockGenerarCodigoMfa).toHaveBeenCalledWith(5);
    expect(result).toEqual(challenge);
  });
});

describe("authService - register", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("lanza error cuando faltan campos obligatorios", async () => {
    await expect(
      register({
        nombre: "",
        correo: "",
        password: "",
      }),
    ).rejects.toMatchObject({
      message: "Todos los campos son obligatorios",
      code: "DATOS_INCOMPLETOS",
    });
  });

  test("lanza error cuando el correo ya existe", async () => {
    mockGetUserByCorreo.mockResolvedValue({
      id_usuario: 1,
      correo: "existente@test.com",
    });

    await expect(
      register({
        nombre: "Usuario Existente",
        correo: "existente@test.com",
        password: "123456",
      }),
    ).rejects.toMatchObject({
      message: "El correo ya está registrado",
      code: "CORREO_YA_REGISTRADO",
    });

    expect(mockBcryptHash).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  test("cifra la contraseña y registra al usuario como CLIENTE", async () => {
    const usuarioCreado = {
      id_usuario: 10,
      rol: "CLIENTE",
      nombre: "Usuario Nuevo",
      correo: "nuevo@test.com",
      activo: true,
    };

    mockGetUserByCorreo.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("password-hasheada");
    mockCreateUser.mockResolvedValue(usuarioCreado);

    const result = await register({
      nombre: "Usuario Nuevo",
      correo: "nuevo@test.com",
      password: "123456",
      rol: "ADMINISTRADOR",
    });

    expect(mockBcryptHash).toHaveBeenCalledWith("123456", 10);

    expect(mockCreateUser).toHaveBeenCalledWith({
      rol: "CLIENTE",
      nombre: "Usuario Nuevo",
      correo: "nuevo@test.com",
      password_hash: "password-hasheada",
    });

    expect(result).toEqual({
      user: usuarioCreado,
    });
  });
});