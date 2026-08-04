USE SimuladorBancarioDB;
GO

/* Cambie el correo por el usuario que será plataformista/administrador. */
DECLARE @Correo VARCHAR(150) = 'cambie_este_correo@gmail.com';

UPDATE dbo.Usuario
SET rol = 'ADMINISTRADOR'
WHERE correo = @Correo;

SELECT id_usuario, nombre, correo, rol, activo
FROM dbo.Usuario
WHERE correo = @Correo;
GO
