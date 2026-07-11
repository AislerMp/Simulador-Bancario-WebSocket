/* =========================================================
   BASE DE DATOS: Simulador Bancario por Socket
   MOTOR: SQL Server
   ========================================================= */

USE master;
GO

IF DB_ID(N'SimuladorBancarioDB') IS NULL
BEGIN
    EXEC(N'CREATE DATABASE SimuladorBancarioDB');
END;
GO

USE SimuladorBancarioDB;
GO

/* =========================================================
   SOLO PARA DESARROLLO:
   Descomenta este bloque si deseas borrar las tablas
   y volver a crearlas desde cero.

DROP TABLE IF EXISTS dbo.Transaccion;
DROP TABLE IF EXISTS dbo.Bitacora;
DROP TABLE IF EXISTS dbo.Codigo_MFA;
DROP TABLE IF EXISTS dbo.Cuenta_Bancaria;
DROP TABLE IF EXISTS dbo.Usuario;
GO
========================================================= */


/* =========================================================
   TABLA: Usuario
   ========================================================= */

CREATE TABLE dbo.Usuario (
    id_usuario INT IDENTITY(1,1) NOT NULL,
    rol VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    activo BIT NOT NULL
        CONSTRAINT DF_Usuario_Activo DEFAULT (1),
    fecha_creacion DATETIME2(0) NOT NULL
        CONSTRAINT DF_Usuario_FechaCreacion DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_Usuario
        PRIMARY KEY (id_usuario),

    CONSTRAINT UQ_Usuario_Correo
        UNIQUE (correo),

    CONSTRAINT CK_Usuario_Rol
        CHECK (rol IN ('ADMINISTRADOR', 'CLIENTE'))
);
GO


/* =========================================================
   TABLA: Cuenta_Bancaria
   ========================================================= */

CREATE TABLE dbo.Cuenta_Bancaria (
    id_cuenta INT IDENTITY(1,1) NOT NULL,
    id_usuario INT NOT NULL,
    numero_cuenta VARCHAR(25) NOT NULL,
    saldo_actual DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_Cuenta_Saldo DEFAULT (0),
    estado VARCHAR(15) NOT NULL
        CONSTRAINT DF_Cuenta_Estado DEFAULT ('ACTIVA'),
    fecha_creacion DATETIME2(0) NOT NULL
        CONSTRAINT DF_Cuenta_FechaCreacion DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_Cuenta_Bancaria
        PRIMARY KEY (id_cuenta),

    CONSTRAINT UQ_Cuenta_Bancaria_Numero
        UNIQUE (numero_cuenta),

    CONSTRAINT FK_Cuenta_Bancaria_Usuario
        FOREIGN KEY (id_usuario)
        REFERENCES dbo.Usuario(id_usuario),

    CONSTRAINT CK_Cuenta_Bancaria_Saldo
        CHECK (saldo_actual >= 0),

    CONSTRAINT CK_Cuenta_Bancaria_Estado
        CHECK (estado IN ('ACTIVA', 'BLOQUEADA', 'INACTIVA'))
);
GO


/* =========================================================
   TABLA: Codigo_MFA
   Guarda códigos temporales para el segundo factor.
   ========================================================= */

CREATE TABLE dbo.Codigo_MFA (
    id_codigo_mfa INT IDENTITY(1,1) NOT NULL,
    id_usuario INT NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    fecha_creacion DATETIME2(0) NOT NULL
        CONSTRAINT DF_CodigoMFA_FechaCreacion DEFAULT (SYSDATETIME()),
    fecha_expiracion DATETIME2(0) NOT NULL,
    utilizado BIT NOT NULL
        CONSTRAINT DF_CodigoMFA_Utilizado DEFAULT (0),

    CONSTRAINT PK_Codigo_MFA
        PRIMARY KEY (id_codigo_mfa),

    CONSTRAINT FK_Codigo_MFA_Usuario
        FOREIGN KEY (id_usuario)
        REFERENCES dbo.Usuario(id_usuario),

    CONSTRAINT CK_Codigo_MFA_Fechas
        CHECK (fecha_expiracion > fecha_creacion)
);
GO


/* =========================================================
   TABLA: Bitacora
   id_usuario puede ser NULL para registrar eventos como
   intentos de inicio de sesión de usuarios no existentes.
   ========================================================= */

CREATE TABLE dbo.Bitacora (
    id_bitacora INT IDENTITY(1,1) NOT NULL,
    id_usuario INT NULL,
    accion VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    fecha_hora DATETIME2(0) NOT NULL
        CONSTRAINT DF_Bitacora_FechaHora DEFAULT (SYSDATETIME()),
    ip_origen VARCHAR(45) NULL,

    CONSTRAINT PK_Bitacora
        PRIMARY KEY (id_bitacora),

    CONSTRAINT FK_Bitacora_Usuario
        FOREIGN KEY (id_usuario)
        REFERENCES dbo.Usuario(id_usuario)
);
GO


/* =========================================================
   TABLA: Transaccion
   ========================================================= */

CREATE TABLE dbo.Transaccion (
    id_transaccion INT IDENTITY(1,1) NOT NULL,
    id_cuenta_origen INT NULL,
    id_cuenta_destino INT NULL,
    tipo VARCHAR(20) NOT NULL,
    monto DECIMAL(18,2) NOT NULL,
    fecha_hora DATETIME2(0) NOT NULL
        CONSTRAINT DF_Transaccion_FechaHora DEFAULT (SYSDATETIME()),
    estado VARCHAR(20) NOT NULL
        CONSTRAINT DF_Transaccion_Estado DEFAULT ('PENDIENTE'),
    referencia VARCHAR(50) NOT NULL,
    mti CHAR(4) NOT NULL,
    codigo_respuesta CHAR(2) NULL,
    id_transaccion_original INT NULL,

    CONSTRAINT PK_Transaccion
        PRIMARY KEY (id_transaccion),

    CONSTRAINT UQ_Transaccion_Referencia
        UNIQUE (referencia),

    CONSTRAINT FK_Transaccion_CuentaOrigen
        FOREIGN KEY (id_cuenta_origen)
        REFERENCES dbo.Cuenta_Bancaria(id_cuenta),

    CONSTRAINT FK_Transaccion_CuentaDestino
        FOREIGN KEY (id_cuenta_destino)
        REFERENCES dbo.Cuenta_Bancaria(id_cuenta),

    CONSTRAINT FK_Transaccion_Original
        FOREIGN KEY (id_transaccion_original)
        REFERENCES dbo.Transaccion(id_transaccion),

    CONSTRAINT CK_Transaccion_Tipo
        CHECK (
            tipo IN (
                'TRANSFERENCIA',
                'DEPOSITO',
                'PAGO',
                'REVERSION'
            )
        ),

    CONSTRAINT CK_Transaccion_Monto
        CHECK (monto > 0),

    CONSTRAINT CK_Transaccion_Estado
        CHECK (
            estado IN (
                'PENDIENTE',
                'APROBADA',
                'RECHAZADA',
                'REVERTIDA'
            )
        ),

    CONSTRAINT CK_Transaccion_CuentasDistintas
        CHECK (
            id_cuenta_origen IS NULL
            OR id_cuenta_destino IS NULL
            OR id_cuenta_origen <> id_cuenta_destino
        ),

    CONSTRAINT CK_Transaccion_CuentasPorTipo
        CHECK (
            (
                tipo = 'DEPOSITO'
                AND id_cuenta_origen IS NULL
                AND id_cuenta_destino IS NOT NULL
            )
            OR
            (
                tipo IN ('TRANSFERENCIA', 'REVERSION')
                AND id_cuenta_origen IS NOT NULL
                AND id_cuenta_destino IS NOT NULL
            )
            OR
            (
                tipo = 'PAGO'
                AND id_cuenta_origen IS NOT NULL
            )
        ),

    CONSTRAINT CK_Transaccion_Reversion
        CHECK (
            (
                tipo = 'REVERSION'
                AND id_transaccion_original IS NOT NULL
            )
            OR
            (
                tipo <> 'REVERSION'
                AND id_transaccion_original IS NULL
            )
        )
);
GO


/* =========================================================
   ÍNDICES
   Mejoran la rapidez de búsquedas y consultas frecuentes.
   ========================================================= */

CREATE INDEX IX_Cuenta_Bancaria_Usuario
ON dbo.Cuenta_Bancaria(id_usuario);
GO

CREATE INDEX IX_Codigo_MFA_Usuario_Expiracion
ON dbo.Codigo_MFA(id_usuario, fecha_expiracion DESC);
GO

CREATE INDEX IX_Bitacora_Usuario_Fecha
ON dbo.Bitacora(id_usuario, fecha_hora DESC);
GO

CREATE INDEX IX_Transaccion_CuentaOrigen_Fecha
ON dbo.Transaccion(id_cuenta_origen, fecha_hora DESC);
GO

CREATE INDEX IX_Transaccion_CuentaDestino_Fecha
ON dbo.Transaccion(id_cuenta_destino, fecha_hora DESC);
GO

CREATE UNIQUE INDEX UX_Transaccion_ReversionOriginal
ON dbo.Transaccion(id_transaccion_original)
WHERE id_transaccion_original IS NOT NULL;
GO


/* =========================================================
   VERIFICACIÓN DE TABLAS CREADAS
   ========================================================= */

SELECT name AS tabla_creada
FROM sys.tables
ORDER BY name;
GO