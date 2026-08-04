# Pasos para actualizar y probar

## Base de datos

- Base nueva: ejecute `database/01_create_database_from_scratch.sql`.
- Base existente: ejecute `database/02_migrate_existing_database.sql`.
- Validación: ejecute `database/03_validate_database.sql`.
- Login SQL opcional: configure y ejecute `database/04_create_application_login.example.sql`.
- Primer administrador: configure y ejecute `database/05_promote_user_to_admin.sql`.

Las migraciones deben ejecutarse desde SSMS con Autenticación de Windows o una cuenta `db_owner`.

## Variables de entorno

Copie los archivos de ejemplo:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

No suba los `.env` a GitHub.

## Ejecución

Backend:

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

Frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Abra `http://localhost:4000`.

## Prueba funcional mínima

1. Registre un cliente.
2. Complete login y MFA.
3. Envíe una solicitud de cuenta.
4. Apruébela con un administrador.
5. Realice un depósito en efectivo desde administración.
6. Pruebe transferencia por IBAN y pago de servicio.
7. Revise comprobante, historial y bitácora.
8. Pruebe retiro, bloqueo y reversión.
