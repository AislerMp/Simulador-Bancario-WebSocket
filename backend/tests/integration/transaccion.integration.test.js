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

import { depositar } from "../../src/services/transaccionService.js";

import {
  getCuentaById,
} from "../../src/repositories/cuentaBancariaRepositorie.js";

describe("Integración - Depósito", () => {

  afterAll(async () => {
    await closeConnection();
  });

  test("Debe realizar correctamente un depósito", async () => {

    //----------------------------------
    // Abrimos una transacción REAL
    //----------------------------------

    const transaction = await beginTransaction();

    try {

      const idCuenta = 1;

      const cuentaAntes = await getCuentaById(idCuenta, transaction);

      const resultado = await depositar({
        idCuentaDestino: idCuenta,
        monto: 1000,
      }, transaction);

      console.time("deposito");
      const cuentaDespues = await getCuentaById(idCuenta, transaction);
      console.timeEnd("deposito");

      expect(resultado).not.toBeNull();

      expect(resultado.tipo).toBe("DEPOSITO");

      expect(resultado.estado).toBe("APROBADA");

      expect(Number(cuentaDespues.saldo_actual))
        .toBe(Number(cuentaAntes.saldo_actual) + 1000);

    }
    finally {

      //----------------------------------
      // Nunca dejamos cambios en BD
      //----------------------------------

      await transaction.rollback();

    }

  });

});