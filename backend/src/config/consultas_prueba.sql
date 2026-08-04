USE SimuladorBancarioDB;
GO

SELECT
    DB_NAME() AS base_actual,
    CASE WHEN OBJECT_ID(N'dbo.Usuario', N'U') IS NOT NULL THEN 1 ELSE 0 END AS tabla_usuario,
    CASE WHEN OBJECT_ID(N'dbo.Cuenta_Bancaria', N'U') IS NOT NULL THEN 1 ELSE 0 END AS tabla_cuenta,
    CASE WHEN OBJECT_ID(N'dbo.Codigo_MFA', N'U') IS NOT NULL THEN 1 ELSE 0 END AS tabla_mfa,
    CASE WHEN OBJECT_ID(N'dbo.Password_Reset', N'U') IS NOT NULL THEN 1 ELSE 0 END AS tabla_password_reset,
    CASE WHEN OBJECT_ID(N'dbo.Bitacora', N'U') IS NOT NULL THEN 1 ELSE 0 END AS tabla_bitacora,
    CASE WHEN OBJECT_ID(N'dbo.Transaccion', N'U') IS NOT NULL THEN 1 ELSE 0 END AS tabla_transaccion,
    CASE WHEN OBJECT_ID(N'dbo.Solicitud_Cuenta', N'U') IS NOT NULL THEN 1 ELSE 0 END AS tabla_solicitud,
    CASE WHEN COL_LENGTH(N'dbo.Usuario', N'intentos_fallidos_login') IS NOT NULL THEN 1 ELSE 0 END AS login_seguro,
    CASE WHEN COL_LENGTH(N'dbo.Codigo_MFA', N'intentos_fallidos') IS NOT NULL THEN 1 ELSE 0 END AS mfa_seguro,
    CASE WHEN COL_LENGTH(N'dbo.Cuenta_Bancaria', N'tipo_cuenta') IS NOT NULL THEN 1 ELSE 0 END AS tipos_cuenta,
    CASE WHEN EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.Transaccion', N'U')
          AND name = N'CK_Transaccion_Tipo'
    ) THEN 1 ELSE 0 END AS tipos_transaccion,
    CASE WHEN EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.Transaccion', N'U')
          AND name = N'UX_Transaccion_Reversion_Unica'
    ) THEN 1 ELSE 0 END AS reversion_unica,
    CASE WHEN EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.Solicitud_Cuenta', N'U')
          AND name = N'UX_Solicitud_Cuenta_Pendiente'
    ) THEN 1 ELSE 0 END AS solicitud_pendiente_unica;
GO

SELECT
    s.name AS esquema,
    t.name AS tabla,
    SUM(p.rows) AS filas
FROM sys.tables AS t
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
INNER JOIN sys.partitions AS p
    ON p.object_id = t.object_id
   AND p.index_id IN (0, 1)
WHERE s.name = N'dbo'
GROUP BY s.name, t.name
ORDER BY t.name;
GO
