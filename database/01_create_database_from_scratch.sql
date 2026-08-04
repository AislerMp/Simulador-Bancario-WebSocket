/* ============================================================================
   SIMULADOR BANCARIO POR WEBSOCKET
   CREACIÓN COMPLETA DE LA BASE DE DATOS DESDE CERO

   ADVERTENCIA: este script ELIMINA SimuladorBancarioDB si ya existe.
   Ejecútelo en SQL Server Management Studio con una cuenta administradora,
   preferiblemente mediante Autenticación de Windows.
   ============================================================================ */

USE master;
GO

IF DB_ID(N'SimuladorBancarioDB') IS NOT NULL
BEGIN
    ALTER DATABASE SimuladorBancarioDB
    SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

    DROP DATABASE SimuladorBancarioDB;
END;
GO

CREATE DATABASE SimuladorBancarioDB;
GO

USE SimuladorBancarioDB;
GO

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
    intentos_fallidos_login INT NOT NULL
        CONSTRAINT DF_Usuario_IntentosLogin DEFAULT (0),
    bloqueado_hasta DATETIME2(0) NULL,

    CONSTRAINT PK_Usuario PRIMARY KEY (id_usuario),
    CONSTRAINT UQ_Usuario_Correo UNIQUE (correo),
    CONSTRAINT CK_Usuario_Rol
        CHECK (rol IN ('ADMINISTRADOR', 'CLIENTE')),
    CONSTRAINT CK_Usuario_IntentosLogin
        CHECK (intentos_fallidos_login >= 0)
);
GO

CREATE TABLE dbo.Cuenta_Bancaria (
    id_cuenta INT IDENTITY(1,1) NOT NULL,
    id_usuario INT NOT NULL,
    numero_cuenta VARCHAR(25) NOT NULL,
    tipo_cuenta VARCHAR(20) NOT NULL
        CONSTRAINT DF_Cuenta_Tipo DEFAULT ('AHORROS'),
    saldo_actual DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_Cuenta_Saldo DEFAULT (0),
    estado VARCHAR(15) NOT NULL
        CONSTRAINT DF_Cuenta_Estado DEFAULT ('ACTIVA'),
    fecha_creacion DATETIME2(0) NOT NULL
        CONSTRAINT DF_Cuenta_FechaCreacion DEFAULT (SYSDATETIME()),

    CONSTRAINT PK_Cuenta_Bancaria PRIMARY KEY (id_cuenta),
    CONSTRAINT UQ_Cuenta_Bancaria_Numero UNIQUE (numero_cuenta),
    CONSTRAINT FK_Cuenta_Bancaria_Usuario
        FOREIGN KEY (id_usuario) REFERENCES dbo.Usuario(id_usuario),
    CONSTRAINT CK_Cuenta_Bancaria_Tipo
        CHECK (tipo_cuenta IN ('AHORROS', 'CORRIENTE')),
    CONSTRAINT CK_Cuenta_Bancaria_Saldo
        CHECK (saldo_actual >= 0),
    CONSTRAINT CK_Cuenta_Bancaria_Estado
        CHECK (estado IN ('ACTIVA', 'BLOQUEADA', 'INACTIVA'))
);
GO

CREATE TABLE dbo.Codigo_MFA (
    id_codigo_mfa INT IDENTITY(1,1) NOT NULL,
    id_usuario INT NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    fecha_creacion DATETIME2(0) NOT NULL
        CONSTRAINT DF_CodigoMFA_FechaCreacion DEFAULT (SYSDATETIME()),
    fecha_expiracion DATETIME2(0) NOT NULL,
    utilizado BIT NOT NULL
        CONSTRAINT DF_CodigoMFA_Utilizado DEFAULT (0),
    intentos_fallidos INT NOT NULL
        CONSTRAINT DF_CodigoMFA_Intentos DEFAULT (0),

    CONSTRAINT PK_Codigo_MFA PRIMARY KEY (id_codigo_mfa),
    CONSTRAINT FK_Codigo_MFA_Usuario
        FOREIGN KEY (id_usuario) REFERENCES dbo.Usuario(id_usuario),
    CONSTRAINT CK_Codigo_MFA_Fechas
        CHECK (fecha_expiracion > fecha_creacion),
    CONSTRAINT CK_Codigo_MFA_Intentos
        CHECK (intentos_fallidos >= 0)
);
GO

CREATE TABLE dbo.Password_Reset (
    id_password_reset INT IDENTITY(1,1) NOT NULL,
    id_usuario INT NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    fecha_creacion DATETIME2(0) NOT NULL
        CONSTRAINT DF_PasswordReset_Fecha DEFAULT (SYSDATETIME()),
    fecha_expiracion DATETIME2(0) NOT NULL,
    utilizado BIT NOT NULL
        CONSTRAINT DF_PasswordReset_Utilizado DEFAULT (0),
    intentos_fallidos INT NOT NULL
        CONSTRAINT DF_PasswordReset_Intentos DEFAULT (0),

    CONSTRAINT PK_Password_Reset PRIMARY KEY (id_password_reset),
    CONSTRAINT FK_Password_Reset_Usuario
        FOREIGN KEY (id_usuario) REFERENCES dbo.Usuario(id_usuario),
    CONSTRAINT CK_Password_Reset_Fechas
        CHECK (fecha_expiracion > fecha_creacion),
    CONSTRAINT CK_Password_Reset_Intentos
        CHECK (intentos_fallidos >= 0)
);
GO

CREATE TABLE dbo.Bitacora (
    id_bitacora INT IDENTITY(1,1) NOT NULL,
    id_usuario INT NULL,
    accion VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    fecha_hora DATETIME2(0) NOT NULL
        CONSTRAINT DF_Bitacora_FechaHora DEFAULT (SYSDATETIME()),
    ip_origen VARCHAR(45) NULL,

    CONSTRAINT PK_Bitacora PRIMARY KEY (id_bitacora),
    CONSTRAINT FK_Bitacora_Usuario
        FOREIGN KEY (id_usuario) REFERENCES dbo.Usuario(id_usuario)
);
GO

CREATE TABLE dbo.Transaccion (
    id_transaccion INT IDENTITY(1,1) NOT NULL,
    id_cuenta_origen INT NULL,
    id_cuenta_destino INT NULL,
    tipo VARCHAR(20) NOT NULL,
    monto DECIMAL(18,2) NOT NULL,
    nombre_servicio VARCHAR(100) NULL,
    referencia_servicio VARCHAR(100) NULL,
    fecha_hora DATETIME2(0) NOT NULL
        CONSTRAINT DF_Transaccion_FechaHora DEFAULT (SYSDATETIME()),
    estado VARCHAR(20) NOT NULL
        CONSTRAINT DF_Transaccion_Estado DEFAULT ('PENDIENTE'),
    referencia VARCHAR(50) NOT NULL,
    mti CHAR(4) NOT NULL,
    codigo_respuesta CHAR(2) NULL,
    id_transaccion_original INT NULL,

    CONSTRAINT PK_Transaccion PRIMARY KEY (id_transaccion),
    CONSTRAINT UQ_Transaccion_Referencia UNIQUE (referencia),
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
        CHECK (tipo IN (
            'TRANSFERENCIA',
            'DEPOSITO',
            'PAGO',
            'RETIRO',
            'REVERSION'
        )),
    CONSTRAINT CK_Transaccion_Monto
        CHECK (monto > 0),
    CONSTRAINT CK_Transaccion_Estado
        CHECK (estado IN (
            'PENDIENTE',
            'APROBADA',
            'RECHAZADA',
            'REVERTIDA'
        )),
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
                tipo = 'TRANSFERENCIA'
                AND id_cuenta_origen IS NOT NULL
                AND id_cuenta_destino IS NOT NULL
            )
            OR
            (
                tipo IN ('PAGO', 'RETIRO')
                AND id_cuenta_origen IS NOT NULL
                AND id_cuenta_destino IS NULL
            )
            OR
            (
                tipo = 'REVERSION'
                AND (
                    id_cuenta_origen IS NOT NULL
                    OR id_cuenta_destino IS NOT NULL
                )
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

CREATE TABLE dbo.Solicitud_Cuenta (
    id_solicitud INT IDENTITY(1,1) NOT NULL,
    id_usuario INT NOT NULL,
    tipo_cuenta VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL
        CONSTRAINT DF_SolicitudCuenta_Estado DEFAULT ('PENDIENTE'),
    fecha_solicitud DATETIME2(0) NOT NULL
        CONSTRAINT DF_SolicitudCuenta_Fecha DEFAULT (SYSDATETIME()),
    fecha_respuesta DATETIME2(0) NULL,
    id_administrador INT NULL,
    observacion VARCHAR(255) NULL,
    id_cuenta_creada INT NULL,

    CONSTRAINT PK_Solicitud_Cuenta PRIMARY KEY (id_solicitud),
    CONSTRAINT FK_Solicitud_Cuenta_Usuario
        FOREIGN KEY (id_usuario) REFERENCES dbo.Usuario(id_usuario),
    CONSTRAINT FK_Solicitud_Cuenta_Administrador
        FOREIGN KEY (id_administrador) REFERENCES dbo.Usuario(id_usuario),
    CONSTRAINT FK_Solicitud_Cuenta_Cuenta
        FOREIGN KEY (id_cuenta_creada)
        REFERENCES dbo.Cuenta_Bancaria(id_cuenta),
    CONSTRAINT CK_Solicitud_Cuenta_Tipo
        CHECK (tipo_cuenta IN ('AHORROS', 'CORRIENTE')),
    CONSTRAINT CK_Solicitud_Cuenta_Estado
        CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    CONSTRAINT CK_Solicitud_Cuenta_Respuesta
        CHECK (
            (estado = 'PENDIENTE'
                AND fecha_respuesta IS NULL
                AND id_administrador IS NULL
                AND id_cuenta_creada IS NULL)
            OR
            (estado = 'APROBADA'
                AND fecha_respuesta IS NOT NULL
                AND id_administrador IS NOT NULL
                AND id_cuenta_creada IS NOT NULL)
            OR
            (estado = 'RECHAZADA'
                AND fecha_respuesta IS NOT NULL
                AND id_administrador IS NOT NULL
                AND id_cuenta_creada IS NULL)
        )
);
GO

CREATE INDEX IX_Cuenta_Bancaria_Usuario
ON dbo.Cuenta_Bancaria(id_usuario);
GO

CREATE INDEX IX_Codigo_MFA_Usuario_Expiracion
ON dbo.Codigo_MFA(id_usuario, fecha_expiracion DESC);
GO

CREATE INDEX IX_Password_Reset_Usuario_Expiracion
ON dbo.Password_Reset(id_usuario, fecha_expiracion DESC);
GO

CREATE INDEX IX_Transaccion_CuentaOrigen_Fecha
ON dbo.Transaccion(id_cuenta_origen, fecha_hora DESC);
GO

CREATE INDEX IX_Transaccion_CuentaDestino_Fecha
ON dbo.Transaccion(id_cuenta_destino, fecha_hora DESC);
GO

CREATE UNIQUE INDEX UX_Transaccion_Reversion_Unica
ON dbo.Transaccion(id_transaccion_original)
WHERE id_transaccion_original IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_Solicitud_Cuenta_Pendiente
ON dbo.Solicitud_Cuenta(id_usuario, tipo_cuenta)
WHERE estado = 'PENDIENTE';
GO

CREATE INDEX IX_Solicitud_Cuenta_Estado_Fecha
ON dbo.Solicitud_Cuenta(estado, fecha_solicitud DESC);
GO

/* Si el login simulador_app ya existe en el servidor, se enlaza con la base. */
IF SUSER_ID(N'simulador_app') IS NOT NULL
BEGIN
    IF DATABASE_PRINCIPAL_ID(N'simulador_app') IS NULL
    BEGIN
        CREATE USER simulador_app FOR LOGIN simulador_app;
    END;

    ALTER ROLE db_datareader ADD MEMBER simulador_app;
    ALTER ROLE db_datawriter ADD MEMBER simulador_app;
END;
GO

PRINT 'SimuladorBancarioDB fue creada correctamente.';
GO
