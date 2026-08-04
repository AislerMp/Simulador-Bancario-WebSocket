# Cambios integrados

## Autenticación y seguridad

- Registro público con rol `CLIENTE`.
- Inicio de sesión con MFA enviado por Gmail.
- Recuperación de contraseña mediante código temporal.
- Contraseñas y códigos temporales almacenados como hash.
- Máximo de intentos para login, MFA y recuperación.
- Bloqueo temporal de usuarios después de varios intentos fallidos.
- Regeneración de sesión después de completar el MFA.
- JWT y validación de operaciones protegidas.
- Datos sensibles ocultos en los logs.

## Cuentas

- Cuentas de tipo `AHORROS` y `CORRIENTE`.
- Solicitud de apertura creada por el cliente.
- Aprobación o rechazo por un administrador.
- IBAN generado al aprobar la solicitud.
- Estados `ACTIVA`, `BLOQUEADA` e `INACTIVA`.
- Consulta administrativa por correo.

## Operaciones

- Transferencia por IBAN y confirmación previa.
- Pago de servicios.
- Depósito en efectivo exclusivo para administradores.
- Retiro en efectivo exclusivo para administradores.
- Validación de saldo, estado y propiedad de cuentas.
- Comprobantes imprimibles.
- Reversiones administrativas con prevención de duplicados.
- Actualización de saldos mediante transacciones SQL.

## Base de datos

La carpeta `database/` incluye creación completa, migración, validación, creación del login de aplicación y promoción del primer administrador.
