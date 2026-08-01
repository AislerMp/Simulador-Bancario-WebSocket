import {
  beforeAll,
  afterAll,
  describe,
  test,
  expect,
  jest,
} from "@jest/globals";

jest.setTimeout(60000);

import {
  beginTransaction,
  closeConnection,
} from "../../src/config/database.js";

import { depositar, transferir } from "../../src/services/transaccionService.js";

import {
  getCuentaById,
} from "../../src/repositories/cuentaBancariaRepositorie.js";

describe("Integración - Depósito", () => {
  // Después de todas las pruebas, cerramos la conexión a la base de datos
  afterAll(async () => {
    await closeConnection();
  });

  test("Debe realizar correctamente un depósito", async () => {
    // Iniciamos una transacción para que los cambios no se guarden en la base de datos
    const transaction = await beginTransaction();

    try {

      const idCuenta = 1;

      const cuentaAntes = await getCuentaById(idCuenta, transaction);

      const resultado = await depositar({
        idCuentaDestino: idCuenta,
        monto: 1000,
      }, transaction);

      const cuentaDespues = await getCuentaById(idCuenta, transaction);

      expect(resultado).not.toBeNull();

      expect(resultado.tipo).toBe("DEPOSITO");

      expect(resultado.estado).toBe("APROBADA");

      expect(Number(cuentaDespues.saldo_actual))
        .toBe(Number(cuentaAntes.saldo_actual) + 1000);

    }
    finally {
      // Hacemos rollback de la transacción para que los cambios no se guarden en la base de datos
      await transaction.rollback();
    } 
  });

  test("Debe realizar correctamente una transferencia", async() => {
    const transaction = await beginTransaction();

    try {
      const idCuentaOrigen = 1;
      const idCuentaDestino = 2;
      const monto = 5000;

      const cuentaOrigenAntes = await getCuentaById(idCuentaOrigen, transaction);
      const cuentaDestinoAntes = await getCuentaById(idCuentaDestino, transaction);

      const resultado = await transferir({
        idCuentaOrigen,
        idCuentaDestino,
        monto
      }, transaction);

      const cuentaOrigenDespues = await getCuentaById(idCuentaOrigen, transaction);
      const cuentaDestinoDespues = await getCuentaById(idCuentaDestino, transaction);

      expect(resultado).not.toBeNull();
      expect(resultado.tipo).toBe("TRANSFERENCIA");
      expect(resultado.estado).toBe("APROBADA");

      expect(Number(cuentaOrigenDespues.saldo_actual))
        .toBe(Number(cuentaOrigenAntes.saldo_actual) - monto);

      expect(Number(cuentaDestinoDespues.saldo_actual))
        .toBe(Number(cuentaDestinoAntes.saldo_actual) + monto);
      
    } finally{
      // Hacemos rollback de la transacción para que los cambios no se guarden en la base de datos
      await transaction.rollback();
    }
  });
});