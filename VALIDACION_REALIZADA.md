# Validación realizada antes de empacar

Se comprobó lo siguiente sobre la versión preparada para GitHub:

- Todos los archivos JavaScript de `backend/src` y `frontend/src` pasan `node --check`.
- Todas las vistas EJS compilan correctamente.
- No se incluyen carpetas `node_modules`.
- No se incluyen archivos `.env` reales.
- Los `package-lock.json` apuntan al registro público de npm.
- El frontend ya no ofrece depósitos directos al cliente.
- El backend solo expone `DEPOSITO_EFECTIVO` para administradores.
- Los scripts SQL incluyen la tabla `Solicitud_Cuenta`, `tipo_cuenta`, retiros, reversiones, MFA, recuperación y bitácora.
- El README documenta creación desde cero, migración y configuración local.

No se ejecutó una prueba completa contra SQL Server desde este entorno. Antes de presentar, debe ejecutarse `database/03_validate_database.sql` y probar el flujo funcional en la computadora del proyecto.
