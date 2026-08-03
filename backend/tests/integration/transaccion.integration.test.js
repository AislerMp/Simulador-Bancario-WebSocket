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

import {
  depositar,
  transferir,
  pagoServicio,
  revertirTransaccion,
} from "../../src/services/transaccionService.js";

import { getCuentaById } from "../../src/repositories/cuentaBancariaRepositorie.js";
import { getTransaccionById } from "../../src/repositories/transaccionRepositorie.js";

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

      const resultado = await depositar(
        {
          idCuentaDestino: idCuenta,
          monto: 1000,
        },
        transaction,
      );

      const cuentaDespues = await getCuentaById(idCuenta, transaction);

      expect(resultado).not.toBeNull();

      expect(resultado.tipo).toBe("DEPOSITO");

      expect(resultado.estado).toBe("APROBADA");

      expect(Number(cuentaDespues.saldo_actual)).toBe(
        Number(cuentaAntes.saldo_actual) + 1000,
      );
    } finally {
      // Hacemos rollback de la transacción para que los cambios no se guarden en la base de datos
      await transaction.rollback();
    }
  });
});

describe("Integración - Transferencia", () => {
  // Después de todas las pruebas, cerramos la conexión a la base de datos
  afterAll(async () => {
    await closeConnection();
  });

  test("Debe realizar correctamente una transferencia", async () => {
    const transaction = await beginTransaction();

    try {
      const idCuentaOrigen = 1;
      const idCuentaDestino = 2;
      const monto = 5000;

      const cuentaOrigenAntes = await getCuentaById(
        idCuentaOrigen,
        transaction,
      );
      const cuentaDestinoAntes = await getCuentaById(
        idCuentaDestino,
        transaction,
      );

      const resultado = await transferir(
        {
          idCuentaOrigen,
          idCuentaDestino,
          monto,
        },
        transaction,
      );

      const cuentaOrigenDespues = await getCuentaById(
        idCuentaOrigen,
        transaction,
      );
      const cuentaDestinoDespues = await getCuentaById(
        idCuentaDestino,
        transaction,
      );

      expect(resultado).not.toBeNull();
      expect(resultado.tipo).toBe("TRANSFERENCIA");
      expect(resultado.estado).toBe("APROBADA");

      expect(Number(cuentaOrigenDespues.saldo_actual)).toBe(
        Number(cuentaOrigenAntes.saldo_actual) - monto,
      );

      expect(Number(cuentaDestinoDespues.saldo_actual)).toBe(
        Number(cuentaDestinoAntes.saldo_actual) + monto,
      );
    } finally {
      // Hacemos rollback de la transacción para que los cambios no se guarden en la base de datos
      await transaction.rollback();
    }
  });
});

describe("Integración - Pago de servicio", () => {
  // Después de todas las pruebas, cerramos la conexión a la base de datos
  afterAll(async () => {
    await closeConnection();
  });

  test("Debe realizar correctamente un pago de servicio", async () => {
    const transaction = await beginTransaction();
    try {
      const idCuentaOrigen = 1;
      const monto = 2000;
      const nombreServicio = "Agua";
      const referenciaServicio = "123456";

      const cuentaOrigenAntes = await getCuentaById(
        idCuentaOrigen,
        transaction,
      );

      const resultado = await pagoServicio(
        {
          idCuentaOrigen,
          monto,
          nombreServicio,
          referenciaServicio,
        },
        transaction,
      );

      const cuentaOrigenDespues = await getCuentaById(
        idCuentaOrigen,
        transaction,
      );

      expect(resultado).not.toBeNull();
      expect(resultado.tipo).toBe("PAGO");
      expect(resultado.estado).toBe("APROBADA");

      expect(Number(cuentaOrigenDespues.saldo_actual)).toBe(
        Number(cuentaOrigenAntes.saldo_actual) - monto,
      );
    } finally {
      // Hacemos rollback de la transacción para que los cambios no se guarden en la base de datos
      await transaction.rollback();
    }
  });
});

describe("Integracion - Reversion de transferencia", () => {
  afterAll(async () => {
    await closeConnection();
  });

  test("Debe revertir una transferencia y restaurar los saldos", async () => {
    const transaction = await beginTransaction();

    try {
      const idCuentaOrigen = 1;
      const idCuentaDestino = 2;
      const monto = 1000;

      //---------------------------------------
      // Estado inicial
      //---------------------------------------

      const cuentaOrigenAntes = await getCuentaById(
        idCuentaOrigen,
        transaction,
      );
      const cuentaDestinoAntes = await getCuentaById(
        idCuentaDestino,
        transaction,
      );

      //---------------------------------------
      // Crear transferencia
      //---------------------------------------

      const transferencia = await transferir(
        { idCuentaOrigen, idCuentaDestino, monto },
        transaction,
      );
      expect(transferencia.estado).toBe("APROBADA");

      //---------------------------------------
      // Ejecutar reversión
      //---------------------------------------

      const reversion = await revertirTransaccion(
        transferencia.id_transaccion,
        transaction,
      );

      const transferenciaActualizada = await getTransaccionById(
        transferencia.id_transaccion,
        transaction,
      );

      //---------------------------------------
      // Estado final
      //---------------------------------------

      const cuentaOrigenDespues = await getCuentaById(
        idCuentaOrigen,
        transaction,
      );
      const cuentaDestinoDespues = await getCuentaById(
        idCuentaDestino,
        transaction,
      );

      expect(reversion).toMatchObject({
        tipo: "REVERSION",
        estado: "APROBADA",
        mti: "0400",
        id_cuenta_origen: idCuentaDestino,
        id_cuenta_destino: idCuentaOrigen,
        id_transaccion_original: transferencia.id_transaccion,
      });
      expect(transferenciaActualizada.estado).toBe("REVERTIDA");
      expect(Number(cuentaOrigenDespues.saldo_actual)).toBe(
        Number(cuentaOrigenAntes.saldo_actual),
      );
      expect(Number(cuentaDestinoDespues.saldo_actual)).toBe(
        Number(cuentaDestinoAntes.saldo_actual),
      );
    } finally {
      await transaction.rollback();
    }
  });

  test("cDebe rechazar la reversion de una transaccion que no es transferenia", async () => {
    const transaction = await beginTransaction();

    try {
      const pago = await pagoServicio(
        {
          idCuentaOrigen: 1,
          monto: 1000,
          nombreServicio: "Agua",
          referenciaServicio: "REV-PAGO-001",
        },
        transaction,
      );

      await expect(
        revertirTransaccion(pago.id_transaccion, transaction),
      ).rejects.toMatchObject({ code: "TIPO_NO_PERMITIDO" });
    } finally {
      await transaction.rollback();
    }
  });

  test("Debe rechazar una transaccion inexistente", async () => {
    const transaction = await beginTransaction();

    try {
      await expect(
        revertirTransaccion(999999999, transaction),
      ).rejects.toMatchObject({
        code: "TRANSACCION_NOT_FOUND",
      });
    } finally {
      await transaction.rollback();
    }
  });

  test("Debe rechazar una transferencia que ya fue revertida", async () => {
    const transaction = await beginTransaction();

    try {
      const transferencia = await transferir(
        { idCuentaOrigen: 1, idCuentaDestino: 2, monto: 1000 },
        transaction,
      );

      await revertirTransaccion(transferencia.id_transaccion, transaction);

      await expect(
        revertirTransaccion(transferencia.id_transaccion, transaction),
      ).rejects.toMatchObject({ code: "TRANSACCION_INVALIDA" });
    } finally {
      await transaction.rollback();
    }
  });

  test("Debe rechazar la reversion sin fondos suficientes en la cuenta destino", async () => {
    const transaction = await beginTransaction();

    try {
      const idCuentaOrigen = 1;
      const idCuentaDestino = 2;
      const monto = 1000;

      const transferencia = await transferir(
        { idCuentaOrigen, idCuentaDestino, monto },
        transaction,
      );
      
      const cuentaDestino = await getCuentaById(idCuentaDestino, transaction);

      await transferir(
        {
          idCuentaOrigen: idCuentaDestino,
          idCuentaDestino: idCuentaOrigen,
          monto: Math.floor(Number(cuentaDestino.saldo_actual)),
        },
        transaction,
      );

      await expect(
        revertirTransaccion(transferencia.id_transaccion, transaction),
      ).rejects.toMatchObject({ code: "SALDO_DESTINO_INSUFICIENTE" });
    } finally {
      await transaction.rollback();
    }
  });
});
