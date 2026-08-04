/* ============================================================================
   MIGRACIÓN DE UNA BASE EXISTENTE
   Conserva usuarios, saldos, cuentas, bitácoras y transacciones.
   Ejecútelo con Autenticación de Windows o una cuenta db_owner.
   ============================================================================ */

USE SimuladorBancarioDB;
GO

IF COL_LENGTH('dbo.Usuario', 'intentos_fallidos_login') IS NULL
BEGIN
    ALTER TABLE dbo.Usuario
    ADD intentos_fallidos_login INT NOT NULL
        CONSTRAINT DF_Usuario_IntentosLogin DEFAULT (0);
END;
GO

IF COL_LENGTH('dbo.Usuario', 'bloqueado_hasta') IS NULL
BEGIN
    ALTER TABLE dbo.Usuario
    ADD bloqueado_hasta DATETIME2(0) NULL;
END;
GO

IF COL_LENGTH('dbo.Codigo_MFA', 'intentos_fallidos') IS NULL
BEGIN
    ALTER TABLE dbo.Codigo_MFA
    ADD intentos_fallidos INT NOT NULL
        CONSTRAINT DF_CodigoMFA_Intentos DEFAULT (0);
END;
GO

IF COL_LENGTH('dbo.Cuenta_Bancaria', 'tipo_cuenta') IS NULL
BEGIN
    ALTER TABLE dbo.Cuenta_Bancaria
    ADD tipo_cuenta VARCHAR(20) NOT NULL
        CONSTRAINT DF_Cuenta_Tipo DEFAULT ('AHORROS') WITH VALUES;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Cuenta_Bancaria', N'U')
      AND name = N'CK_Cuenta_Bancaria_Tipo'
)
BEGIN
    ALTER TABLE dbo.Cuenta_Bancaria WITH CHECK
    ADD CONSTRAINT CK_Cuenta_Bancaria_Tipo
    CHECK (tipo_cuenta IN ('AHORROS', 'CORRIENTE'));
END;
GO

IF OBJECT_ID(N'dbo.Password_Reset', N'U') IS NULL
BEGIN
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
            CHECK (fecha_expiracion > fecha_creacion)
    );
END;
GO

IF OBJECT_ID(N'dbo.Solicitud_Cuenta', N'U') IS NULL
BEGIN
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
            CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA'))
    );
END;
GO

/* Se eliminan primero las restricciones de transacciones para normalizar datos. */
IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Transaccion', N'U')
      AND name = N'CK_Transaccion_CuentasPorTipo'
)
    ALTER TABLE dbo.Transaccion DROP CONSTRAINT CK_Transaccion_CuentasPorTipo;
GO

IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Transaccion', N'U')
      AND name = N'CK_Transaccion_Reversion'
)
    ALTER TABLE dbo.Transaccion DROP CONSTRAINT CK_Transaccion_Reversion;
GO

IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Transaccion', N'U')
      AND name = N'CK_Transaccion_Tipo'
)
    ALTER TABLE dbo.Transaccion DROP CONSTRAINT CK_Transaccion_Tipo;
GO

UPDATE dbo.Transaccion
SET tipo = 'PAGO'
WHERE tipo IN ('PAGO_SERVICIO', 'PAGO SERVICIO');
GO

UPDATE dbo.Transaccion
SET tipo = 'REVERSION'
WHERE tipo IN ('REVERSO', 'REVERSIÓN');
GO

ALTER TABLE dbo.Transaccion WITH NOCHECK
ADD CONSTRAINT CK_Transaccion_Tipo
CHECK (tipo IN (
    'TRANSFERENCIA',
    'DEPOSITO',
    'PAGO',
    'RETIRO',
    'REVERSION'
));
GO
ALTER TABLE dbo.Transaccion CHECK CONSTRAINT CK_Transaccion_Tipo;
GO

ALTER TABLE dbo.Transaccion WITH NOCHECK
ADD CONSTRAINT CK_Transaccion_CuentasPorTipo
CHECK (
    (tipo = 'DEPOSITO'
        AND id_cuenta_origen IS NULL
        AND id_cuenta_destino IS NOT NULL)
    OR
    (tipo = 'TRANSFERENCIA'
        AND id_cuenta_origen IS NOT NULL
        AND id_cuenta_destino IS NOT NULL)
    OR
    (tipo IN ('PAGO', 'RETIRO')
        AND id_cuenta_origen IS NOT NULL
        AND id_cuenta_destino IS NULL)
    OR
    (tipo = 'REVERSION'
        AND (id_cuenta_origen IS NOT NULL OR id_cuenta_destino IS NOT NULL))
);
GO
ALTER TABLE dbo.Transaccion CHECK CONSTRAINT CK_Transaccion_CuentasPorTipo;
GO

ALTER TABLE dbo.Transaccion WITH NOCHECK
ADD CONSTRAINT CK_Transaccion_Reversion
CHECK (
    (tipo = 'REVERSION' AND id_transaccion_original IS NOT NULL)
    OR
    (tipo <> 'REVERSION' AND id_transaccion_original IS NULL)
);
GO
ALTER TABLE dbo.Transaccion CHECK CONSTRAINT CK_Transaccion_Reversion;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Password_Reset', N'U')
      AND name = N'IX_Password_Reset_Usuario_Expiracion'
)
BEGIN
    CREATE INDEX IX_Password_Reset_Usuario_Expiracion
    ON dbo.Password_Reset(id_usuario, fecha_expiracion DESC);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Solicitud_Cuenta', N'U')
      AND name = N'UX_Solicitud_Cuenta_Pendiente'
)
BEGIN
    CREATE UNIQUE INDEX UX_Solicitud_Cuenta_Pendiente
    ON dbo.Solicitud_Cuenta(id_usuario, tipo_cuenta)
    WHERE estado = 'PENDIENTE';
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Solicitud_Cuenta', N'U')
      AND name = N'IX_Solicitud_Cuenta_Estado_Fecha'
)
BEGIN
    CREATE INDEX IX_Solicitud_Cuenta_Estado_Fecha
    ON dbo.Solicitud_Cuenta(estado, fecha_solicitud DESC);
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Transaccion', N'U')
      AND name = N'UX_Transaccion_Reversion_Unica'
)
AND NOT EXISTS (
    SELECT id_transaccion_original
    FROM dbo.Transaccion
    WHERE id_transaccion_original IS NOT NULL
    GROUP BY id_transaccion_original
    HAVING COUNT(*) > 1
)
BEGIN
    CREATE UNIQUE INDEX UX_Transaccion_Reversion_Unica
    ON dbo.Transaccion(id_transaccion_original)
    WHERE id_transaccion_original IS NOT NULL;
END;
GO

IF SUSER_ID(N'simulador_app') IS NOT NULL
BEGIN
    IF DATABASE_PRINCIPAL_ID(N'simulador_app') IS NULL
        CREATE USER simulador_app FOR LOGIN simulador_app;

    ALTER ROLE db_datareader ADD MEMBER simulador_app;
    ALTER ROLE db_datawriter ADD MEMBER simulador_app;
END;
GO

PRINT 'Migración aplicada correctamente.';
GO
