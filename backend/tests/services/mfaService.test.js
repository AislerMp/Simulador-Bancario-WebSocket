import { beforeEach, describe, expect, jest, test } from "@jest/globals";

process.env.JWT_SECRET = "jwt-secret-pruebas";

const mockRandomInt = jest.fn();
const mockBcryptHash = jest.fn();
const mockBcryptCompare = jest.fn();
const mockCreateCodigoMfaCode = jest.fn();
const mockGetValidMfaChallenge = jest.fn();
const mockMarkMfaCodeAsUsed = jest.fn();
const mockInvalidatePendingCodesByUserId = jest.fn();
const mockRegisterInvalidMfaAttempt = jest.fn();
const mockGetUserById = jest.fn();
const mockSendMfaCodeEmail = jest.fn();
const mockJwtSign = jest.fn();
const mockRegistrarEvento = jest.fn();

jest.unstable_mockModule("node:crypto", () => ({ randomInt: mockRandomInt }));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: mockBcryptHash,
    compare: mockBcryptCompare,
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: { sign: mockJwtSign },
}));

jest.unstable_mockModule("../../src/repositories/mfaRepositorie.js", () => ({
  createCodigoMfaCode: mockCreateCodigoMfaCode,
  getValidMfaChallenge: mockGetValidMfaChallenge,
  markMfaCodeAsUsed: mockMarkMfaCodeAsUsed,
  invalidatePendingCodesByUserId: mockInvalidatePendingCodesByUserId,
  registerInvalidMfaAttempt: mockRegisterInvalidMfaAttempt,
}));

jest.unstable_mockModule("../../src/repositories/authRepositorie.js", () => ({
  getUserById: mockGetUserById,
}));

jest.unstable_mockModule("../../src/services/emailService.js", () => ({
  sendMfaCodeEmail: mockSendMfaCodeEmail,
}));

jest.unstable_mockModule("../../src/services/bitacoraService.js", () => ({
  registrarEvento: mockRegistrarEvento,
  BITACORA_ACCIONES: { MFA: "MFA" },
}));

const { generarCodigoMfa, validateMfaChallenge } = await import(
  "../../src/services/mfaService.js"
);

describe("mfaService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("genera y envía un código MFA", async () => {
    mockGetUserById.mockResolvedValue({
      id_usuario: 1,
      nombre: "Cliente",
      correo: "cliente@test.com",
    });
    mockRandomInt.mockReturnValue(123456);
    mockBcryptHash.mockResolvedValue("hash");
    mockInvalidatePendingCodesByUserId.mockResolvedValue(0);
    mockCreateCodigoMfaCode.mockResolvedValue({
      id_codigo_mfa: 10,
      id_usuario: 1,
    });
    mockSendMfaCodeEmail.mockResolvedValue({ sent: true });

    const result = await generarCodigoMfa(1);

    expect(mockSendMfaCodeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        correo: "cliente@test.com",
        codigo: "123456",
      }),
    );
    expect(result.id_codigo_mfa).toBe(10);
  });

  test("invalida el desafío después de cinco intentos", async () => {
    mockGetValidMfaChallenge.mockResolvedValue({
      id_codigo_mfa: 5,
      codigo_hash: "hash",
    });
    mockBcryptCompare.mockResolvedValue(false);
    mockRegisterInvalidMfaAttempt.mockResolvedValue({
      intentos_fallidos: 5,
      utilizado: true,
    });

    await expect(validateMfaChallenge(1, "123456")).rejects.toMatchObject({
      code: "CODIGO_MFA_BLOQUEADO",
    });
  });

  test("genera JWT cuando el código es correcto", async () => {
    mockGetValidMfaChallenge.mockResolvedValue({
      id_codigo_mfa: 6,
      codigo_hash: "hash",
    });
    mockBcryptCompare.mockResolvedValue(true);
    mockMarkMfaCodeAsUsed.mockResolvedValue(true);
    mockGetUserById.mockResolvedValue({
      id_usuario: 2,
      rol: "CLIENTE",
      nombre: "Cliente",
      correo: "cliente@test.com",
      activo: true,
    });
    mockJwtSign.mockReturnValue("jwt");

    const result = await validateMfaChallenge(2, "123456");
    expect(result.token).toBe("jwt");
    expect(mockRegistrarEvento).toHaveBeenCalled();
  });
});
