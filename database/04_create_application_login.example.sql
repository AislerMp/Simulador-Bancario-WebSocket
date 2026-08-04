/*
   OPCIONAL: crea el login SQL usado por el backend.
   CAMBIE la contraseña antes de ejecutar este archivo.
   Ejecútelo con una cuenta administradora de SQL Server.
*/

USE master;
GO

DECLARE @LoginName SYSNAME = N'simulador_app';
DECLARE @LoginPassword NVARCHAR(128) = N'CAMBIE_ESTA_CONTRASENA_LARGA';
DECLARE @Sql NVARCHAR(MAX);

IF SUSER_ID(@LoginName) IS NULL
BEGIN
    SET @Sql = N'CREATE LOGIN ' + QUOTENAME(@LoginName)
        + N' WITH PASSWORD = ' + QUOTENAME(@LoginPassword, '''')
        + N', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
    EXEC sys.sp_executesql @Sql;
END;
GO

USE SimuladorBancarioDB;
GO

IF DATABASE_PRINCIPAL_ID(N'simulador_app') IS NULL
    CREATE USER simulador_app FOR LOGIN simulador_app;
GO

ALTER ROLE db_datareader ADD MEMBER simulador_app;
ALTER ROLE db_datawriter ADD MEMBER simulador_app;
GO
