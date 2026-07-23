import { getConnection, sql } from '../config/database.js';

export async function createCuentaBancaria(idUsuario, numeroCuenta) {
    const pool = await getConnection();

    const result = await pool.request()
        .input("id_usuario", sql.Int, idUsuario)
        .input("numero_cuenta", sql.VarChar(22), numeroCuenta)
        .query(`INSERT INTO Cuenta_Bancaria (id_usuario, numero_cuenta) 
            OUTPUT
                INSERTED.id_cuenta,
                INSERTED.id_usuario,
                INSERTED.numero_cuenta,
                INSERTED.saldo_actual,
                INSERTED.estado,
                INSERTED.fecha_creacion
            VALUES (@id_usuario, @numero_cuenta);`);
    return result.recordset[0] || null;
}

export async function getCuentaByNumero(numeroCuenta) {
    const pool = await getConnection();
    const result = await pool.request()
        .input("numero_cuenta", sql.VarChar(22), numeroCuenta)
        .query("SELECT TOP 1 id_cuenta FROM Cuenta_Bancaria WHERE numero_cuenta = @numero_cuenta;");
    return result.recordset[0] || null;
}

export async function getCuentasByUser(idUsuario) {
    const pool = await getConnection();
    
    const result = await pool.request()
        .input("id_usuario", sql.Int, idUsuario)
        .query("SELECT * FROM Cuenta_Bancaria WHERE id_usuario = @id_usuario;");
    return result.recordset || null;
}

export async function getCuentaById(idCuenta){
    const pool = await getConnection();
    const result = await pool.request()
        .input("id_cuenta", sql.Int, idCuenta)
        .query("SELECT TOP 1 * FROM Cuenta_Bancaria WHERE id_cuenta = @id_cuenta;");
    return result.recordset[0] || null;
}

export async function updateEstadoCuenta(idCuenta, estado) {
    const pool = await getConnection();
    const result = await pool.request()
        .input("id_cuenta", sql.Int, idCuenta)
        .input("estado", sql.VarChar, estado)
        .query("UPDATE Cuenta_Bancaria SET estado = @estado WHERE id_cuenta = @id_cuenta;")
    return result.rowsAffected[0] > 0;
}

export async function updateSaldoCuenta(idCuenta, saldo){
    const pool = await getConnection();
    const result = await pool.request()
        .input("id_cuenta", sql.Int, idCuenta)
        .input("saldo_actual", sql.Decimal, saldo)
        .query("UPDATE Cuenta_Bancaria SET saldo_actual = saldo_actual - @saldo_actual WHERE id_cuenta = @id_cuenta;")
    return result.rowsAffected[0] > 0;
}