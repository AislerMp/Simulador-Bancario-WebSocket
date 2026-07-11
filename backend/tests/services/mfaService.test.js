import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

process.env.JWT_SECRET = "jwt-secret-para-pruebas";

const mockRandomInt = jest.fn();

const mockBcryptHash = jest.fn();
const mockBcryptCompare = jest.fn();

const mockCreateCodigoMfaCode = jest.fn();
const mockGetValidMfaChallenge = jest.fn();
const mockMarkMfaCodeAsUsed = jest.fn();
const mockInvalidatePendingCodesByUserId = jest.fn();

const mockGetUserById = jest.fn();
const mockJwtSign = jest.fn();

jest.unstable_mockModule("node:crypto", () => ({
  randomInt: mockRandomInt,
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: mockBcryptHash,
    compare: mockBcryptCompare,
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: mockJwtSign,
  },
}));

jest.unstable_mockModule(
  "../../src/repositories/mfaRepositorie.js",
  () => ({
    createCodigoMfaCode: mockCreateCodigoMfaCode,
    getValidMfaChallenge: mockGetValidMfaChallenge,
    markMfaCodeAsUsed: mockMarkMfaCodeAsUsed,
    invalidatePendingCodesByUserId: mockInvalidatePendingCodesByUserId,
  }),
);

jest.unstable_mockModule(
  "../../src/repositories/authRepositorie.js",
  () => ({
    getUserById: mockGetUserById,
  }),
);

const { generarCodigoMfa, validateMfaChallenge } =
  await import("../../src/services/mfaService.js");

describe("mfaService - generarCodigoMfa", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();

    jest.setSystemTime(
      new Date("2026-07-10T20:00:00.000Z"),
    );
  });

  test("lanza error cuando el ID del usuario es inválido", async () => {
    await expect(generarCodigoMfa(0)).rejects.toMatchObject({
      message: "El usuario indicado no es válido",
      code: "USUARIO_INVALIDO",
    });

    expect(mockRandomInt).not.toHaveBeenCalled();
  });

  test("genera, cifra y guarda un código MFA", async () => {
    const fechaExpiracionEsperada = new Date(
      "2026-07-10T20:05:00.000Z",
    );

    const challengeCreado = {
      id_codigo_mfa: 30,
      id_usuario: 8,
      fecha_expiracion: fechaExpiracionEsperada,
      utilizado: false,
    };

    mockRandomInt.mockReturnValue(483921);
    mockBcryptHash.mockResolvedValue("hash-del-codigo");
    mockInvalidatePendingCodesByUserId.mockResolvedValue(2);
    mockCreateCodigoMfaCode.mockResolvedValue(
      challengeCreado,
    );

    const result = await generarCodigoMfa(8);

    expect(mockRandomInt).toHaveBeenCalledWith(
      100000,
      1000000,
    );

    expect(mockBcryptHash).toHaveBeenCalledWith(
      "483921",
      10,
    );

    expect(
      mockInvalidatePendingCodesByUserId,
    ).toHaveBeenCalledWith(8);

    expect(mockCreateCodigoMfaCode).toHaveBeenCalledWith({
      idUsuario: 8,
      codigoMfahash: "hash-del-codigo",
      fechaExpiracion: fechaExpiracionEsperada,
    });

    expect(result).toEqual(challengeCreado);
  });

  test("lanza error cuando el repository no crea el desafío", async () => {
    mockRandomInt.mockReturnValue(123456);
    mockBcryptHash.mockResolvedValue("hash");
    mockInvalidatePendingCodesByUserId.mockResolvedValue(0);
    mockCreateCodigoMfaCode.mockResolvedValue(null);

    await expect(generarCodigoMfa(3)).rejects.toMatchObject({
      message: "No se pudo generar el código MFA",
      code: "GENERACION_CODIGO_FALLIDA",
    });
  });
});

describe("mfaService - validateMfaChallenge", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("lanza error cuando el usuario es inválido", async () => {
    await expect(
      validateMfaChallenge(-1, "123456"),
    ).rejects.toMatchObject({
      code: "USUARIO_INVALIDO",
    });
  });

  test("lanza error cuando el código no tiene seis dígitos", async () => {
    await expect(
      validateMfaChallenge(1, "12A456"),
    ).rejects.toMatchObject({
      code: "CODIGO_MFA_INVALIDO",
    });

    expect(mockGetValidMfaChallenge).not.toHaveBeenCalled();
  });

  test("lanza error cuando no existe un desafío vigente", async () => {
    mockGetValidMfaChallenge.mockResolvedValue(null);

    await expect(
      validateMfaChallenge(1, "123456"),
    ).rejects.toMatchObject({
      message: "No hay un desafío MFA válido para este usuario",
      code: "DESAFIO_MFA_NO_ENCONTRADO",
    });
  });

  test("lanza error cuando el código no coincide", async () => {
    mockGetValidMfaChallenge.mockResolvedValue({
      id_codigo_mfa: 4,
      id_usuario: 1,
      codigo_hash: "hash-real",
      fecha_expiracion: new Date(Date.now() + 300000),
    });

    mockBcryptCompare.mockResolvedValue(false);

    await expect(
      validateMfaChallenge(1, "123456"),
    ).rejects.toMatchObject({
      code: "CODIGO_MFA_INVALIDO",
    });

    expect(mockBcryptCompare).toHaveBeenCalledWith(
      "123456",
      "hash-real",
    );

    expect(mockMarkMfaCodeAsUsed).not.toHaveBeenCalled();
  });

  test("lanza error cuando el código está expirado", async () => {
    mockGetValidMfaChallenge.mockResolvedValue({
      id_codigo_mfa: 5,
      id_usuario: 1,
      codigo_hash: "hash",
      fecha_expiracion: new Date(Date.now() - 60000),
    });

    mockBcryptCompare.mockResolvedValue(true);

    await expect(
      validateMfaChallenge(1, "123456"),
    ).rejects.toMatchObject({
      code: "CODIGO_MFA_EXPIRADO",
    });

    expect(mockMarkMfaCodeAsUsed).not.toHaveBeenCalled();
  });

  test("lanza error cuando no puede marcar el código como utilizado", async () => {
    mockGetValidMfaChallenge.mockResolvedValue({
      id_codigo_mfa: 6,
      id_usuario: 2,
      codigo_hash: "hash",
      fecha_expiracion: new Date(Date.now() + 300000),
    });

    mockBcryptCompare.mockResolvedValue(true);
    mockMarkMfaCodeAsUsed.mockResolvedValue(false);

    await expect(
      validateMfaChallenge(2, "123456"),
    ).rejects.toMatchObject({
      code: "MARCAR_CODIGO_FALLIDO",
    });
  });

  test("genera un JWT cuando el código MFA es correcto", async () => {
    const usuario = {
      id_usuario: 9,
      rol: "CLIENTE",
      nombre: "Aisler",
      correo: "aisler@test.com",
      activo: true,
    };

    mockGetValidMfaChallenge.mockResolvedValue({
      id_codigo_mfa: 40,
      id_usuario: 9,
      codigo_hash: "hash-del-codigo",
      fecha_expiracion: new Date(Date.now() + 300000),
    });

    mockBcryptCompare.mockResolvedValue(true);
    mockMarkMfaCodeAsUsed.mockResolvedValue(true);
    mockGetUserById.mockResolvedValue(usuario);
    mockJwtSign.mockReturnValue("jwt-generado");

    const result = await validateMfaChallenge(
      9,
      "483921",
    );

    expect(mockMarkMfaCodeAsUsed).toHaveBeenCalledWith(40);
    expect(mockGetUserById).toHaveBeenCalledWith(9);

    expect(mockJwtSign).toHaveBeenCalledWith(
      {
        idUsuario: 9,
        rol: "CLIENTE",
        nombre: "Aisler",
        correo: "aisler@test.com",
      },
      "jwt-secret-para-pruebas",
      {
        expiresIn: "1h",
      },
    );

    expect(result).toEqual({
      user: usuario,
      token: "jwt-generado",
    });
  });
});