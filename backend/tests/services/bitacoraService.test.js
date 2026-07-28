import { describe, test, expect, beforeEach, jest } from "@jest/globals";

const mockCreateMovimiento = jest.fn();
const mockgetMovimientos = jest.fn();
const mockgetMovimientosUsuario = jest.fn();

jest.unstable_mockModule(
  "../../src/repositories/bitacoraRepositorie.js",
  () => ({
    createMovimiento: mockCreateMovimiento,
    getMovimientos: mockgetMovimientos,
    getMovimientosUsuario: mockgetMovimientosUsuario,
  }),
);

const bitacoraService = await import("../../src/services/bitacoraService.js");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Bitacora tests", () => {
  test("registra correctamente un movimiento", async () => {
    mockCreateMovimiento.mockResolvedValue({
      id_bitacora: 50,
    });

    const movimiento = await bitacoraService.registrarEvento({
      idUsuario: 1,

      accion: "LOGIN",

      descripcion: "Inicio de sesión.",
    });

    expect(movimiento.id_bitacora).toBe(50);
  });

  test("lanza error cuando el usuario es inválido", async () => {
    await expect(
      bitacoraService.registrarEvento({
        idUsuario: 0,

        accion: "LOGIN",

        descripcion: "hola",
      }),
    ).rejects.toMatchObject({
      code: "DATOS_INCOMPLETOS",
    });
  });

  test("lanza error cuando la acción está vacía", async () => {
    await expect(
      bitacoraService.registrarEvento({
        idUsuario: 1,

        accion: "",

        descripcion: "hola",
      }),
    ).rejects.toMatchObject({
      code: "ACCION_INVALIDA",
    });
  });
});
