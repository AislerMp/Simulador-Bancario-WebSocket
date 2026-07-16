import { getConnection, sql } from "../config/database.js";

export async function getUsers() {
    const pool = await getConnection();
    const result = await pool.request().query(`
        SELECT
        id_usuario,
        rol,
        nombre,
        correo,
        activo,
        fecha_creacion
        FROM Usuario
    `);

    console.log("Usuarios obtenidos:", result);
    return result.recordset;
}

export async function getUserByCorreo(correo){
    const pool = await getConnection();
    const result = await pool.request()
        .input("correo", sql.VarChar, correo)
        .query("Select TOP 1 * From Usuario Where correo = @correo");

    return result.recordset[0] || null;
}

export async function getUserById(id) {
    const pool = await getConnection();
    const result = await pool.request()
        .input("id", sql.Int, id)
        .query("Select TOP 1 * From Usuario Where id_usuario = @id");
    return result.recordset[0] || null;
}

export async function createUser(user) {
    const pool = await getConnection();
    
    const result = await pool.request()
        .input("rol", sql.VarChar, user.rol)
        .input("nombre", sql.VarChar, user.nombre)
        .input('correo', sql.VarChar, user.correo)
        .input('password_hash', sql.VarChar, user.password_hash)
        .query(`
        INSERT INTO Usuario (rol, nombre, correo, password_hash)
        OUTPUT
            INSERTED.id_usuario,
            INSERTED.rol,
            INSERTED.nombre,
            INSERTED.correo,
            INSERTED.activo,
            INSERTED.fecha_creacion
        VALUES (@rol, @nombre, @correo, @password_hash);
        `);

    console.log("Usuario creado:", result);
    return result.recordset[0] || null;
}