// tests/services/authService.test.js

import { jest } from "@jest/globals";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "clave_test";

// Mock del repository antes de importar el service
const mockGetUserByCorreo = jest.fn();
const mockCreateUser = jest.fn();

jest.unstable_mockModule("../../src/repositories/authRepositorie.js", () => ({
  getUserByCorreo: mockGetUserByCorreo,
  createUser: mockCreateUser
}));

const { login, register } = await import("../../src/services/authService.js");

describe("authService - login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("debería lanzar error si no se envía correo o contraseña", async () => {
    await expect(login("", "")).rejects.toThrow(
      "Correo y contraseña son obligatorios"
    );
  });

  test("debería lanzar error si el usuario no existe", async () => {
    mockGetUserByCorreo.mockResolvedValue(null);

    await expect(login("noexiste@test.com", "123456")).rejects.toThrow(
      "Correo o contraseña incorrectos"
    );
  });

  test("debería lanzar error si la contraseña es incorrecta", async () => {
    const passwordHash = await bcrypt.hash("passwordCorrecta", 10);

    mockGetUserByCorreo.mockResolvedValue({
      id_usuario: 1,
      rol: "CLIENTE",
      nombre: "Cliente Prueba",
      correo: "cliente@test.com",
      password_hash: passwordHash,
      activo: true
    });

    await expect(login("cliente@test.com", "passwordIncorrecta")).rejects.toThrow(
      "Correo o contraseña incorrectos"
    );
  });

  test("debería lanzar error si el usuario está desactivado", async () => {
    const passwordHash = await bcrypt.hash("123456", 10);

    mockGetUserByCorreo.mockResolvedValue({
      id_usuario: 1,
      rol: "CLIENTE",
      nombre: "Cliente Prueba",
      correo: "cliente@test.com",
      password_hash: passwordHash,
      activo: 0
    });

    await expect(login("cliente@test.com", "123456")).rejects.toThrow(
      "El usuario está desactivado"
    );
  });

  test("debería retornar usuario y token si las credenciales son correctas", async () => {
    const passwordHash = await bcrypt.hash("123456", 10);

    mockGetUserByCorreo.mockResolvedValue({
      id_usuario: 1,
      rol: "CLIENTE",
      nombre: "Cliente Prueba",
      correo: "cliente@test.com",
      password_hash: passwordHash,
      activo: true
    });

    const result = await login("cliente@test.com", "123456");

    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("token");

    expect(result.user.correo).toBe("cliente@test.com");
    expect(result.user.rol).toBe("CLIENTE");

    const decoded = jwt.verify(result.token, process.env.JWT_SECRET);

    expect(decoded.idUsuario).toBe(1);
    expect(decoded.rol).toBe("CLIENTE");
    expect(decoded.correo).toBe("cliente@test.com");
  });
});

describe("authService - register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("debería lanzar error si faltan campos obligatorios", async () => {
    await expect(register({})).rejects.toThrow(
      "Todos los campos son obligatorios"
    );
  });

  test("debería lanzar error si el correo ya está registrado", async () => {
    mockGetUserByCorreo.mockResolvedValue({
      id_usuario: 1,
      correo: "cliente@test.com"
    });

    await expect(
      register({
        rol: "CLIENTE",
        nombre: "Cliente Prueba",
        correo: "cliente@test.com",
        password: "123456"
      })
    ).rejects.toThrow("El correo ya está registrado");
  });

  test("debería crear un usuario nuevo con contraseña cifrada", async () => {
    mockGetUserByCorreo.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(true);

    await register({
      rol: "CLIENTE",
      nombre: "Cliente Prueba",
      correo: "cliente@test.com",
      password: "123456"
    });

    expect(mockCreateUser).toHaveBeenCalledTimes(1);

    const userPassedToCreate = mockCreateUser.mock.calls[0][0];

    expect(userPassedToCreate.nombre).toBe("Cliente Prueba");
    expect(userPassedToCreate.correo).toBe("cliente@test.com");
    expect(userPassedToCreate.rol).toBe("CLIENTE");
    expect(userPassedToCreate.password_hash).toBeDefined();
    expect(userPassedToCreate.password_hash).not.toBe("123456");

    const passwordValida = await bcrypt.compare(
      "123456",
      userPassedToCreate.password_hash
    );

    expect(passwordValida).toBe(true);
  });
});