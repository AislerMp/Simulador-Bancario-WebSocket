# Simulador Bancario por WebSocket

Proyecto universitario que simula operaciones bancarias mediante una arquitectura separada:

```text
Navegador → Frontend EJS (puerto 4000) → WebSocket → Backend (puerto 3000) → SQL Server
```

El frontend nunca se conecta directamente a SQL Server. Todas las operaciones viajan al backend mediante mensajes WebSocket con `type`, `payload`, `requestId` y, cuando corresponde, un JWT.

## Funcionalidades incluidas

### Cliente

- Registro con rol `CLIENTE`.
- Inicio de sesión con contraseña y MFA enviado por correo.
- Recuperación de contraseña mediante código temporal.
- Consulta de cuentas, saldos, movimientos y bitácora personal.
- Solicitud de apertura de cuenta de ahorros o corriente.
- Consulta del estado de las solicitudes: `PENDIENTE`, `APROBADA` o `RECHAZADA`.
- Transferencias por IBAN con pantalla de confirmación.
- Pago de servicios.
- Comprobante imprimible de operaciones.

### Administrador o plataformista

- Revisión, aprobación y rechazo de solicitudes de cuentas.
- Creación manual de cuentas para pruebas o atención presencial.
- Activación, bloqueo e inactivación de cuentas.
- Depósitos en efectivo.
- Retiros en efectivo con validación de saldo.
- Consulta de todas las cuentas y de la bitácora general.
- Reversión de transacciones aprobadas.

> Un cliente no puede acreditarse dinero directamente. Los depósitos representan efectivo recibido por un administrador. Para mover fondos entre cuentas se utiliza una transferencia.

## Seguridad implementada

- Contraseñas almacenadas con `bcrypt`.
- MFA y códigos de recuperación almacenados como hash.
- JWT para operaciones protegidas.
- Cookies de sesión `httpOnly`.
- Bloqueo temporal después de intentos fallidos de inicio de sesión.
- Límite de intentos para MFA y recuperación.
- Verificación de propiedad de la cuenta origen en el backend.
- Validación de rol administrativo en el backend.
- Consultas SQL parametrizadas.
- Operaciones de saldo dentro de transacciones SQL con `commit` y `rollback`.
- Contraseñas, MFA y tokens ocultos en los logs.
- Límite de tamaño para mensajes WebSocket.

## Requisitos

- Node.js 20 o superior.
- npm.
- SQL Server 2016 o superior.
- SQL Server Management Studio.
- Una cuenta Gmail con verificación en dos pasos y contraseña de aplicación, solamente si se desea enviar el MFA por correo.

## 1. Preparar la base de datos

Los archivos están en [`database/`](database/):

| Archivo | Uso |
|---|---|
| `01_create_database_from_scratch.sql` | Elimina y reconstruye toda la base. Úselo solo cuando desea empezar desde cero. |
| `02_migrate_existing_database.sql` | Actualiza una base anterior conservando sus datos. |
| `03_validate_database.sql` | Comprueba tablas, columnas, restricciones e índices. |
| `04_create_application_login.example.sql` | Crea opcionalmente el login `simulador_app`. Cambie la contraseña antes de ejecutarlo. |
| `05_promote_user_to_admin.sql` | Cambia un usuario registrado a `ADMINISTRADOR`. |

### Base nueva

1. Abra SSMS con **Autenticación de Windows**.
2. Ejecute `database/01_create_database_from_scratch.sql`.
3. Cambie la contraseña dentro de `database/04_create_application_login.example.sql` y ejecútelo.
4. Ejecute `database/03_validate_database.sql` y confirme que todos los indicadores sean `1`.

### Base existente

1. Realice un respaldo.
2. Abra SSMS con **Autenticación de Windows**.
3. Ejecute `database/02_migrate_existing_database.sql`.
4. Ejecute `database/03_validate_database.sql`.

## 2. Configurar el backend

Desde la raíz del repositorio:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edite `backend/.env`:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET="COLOQUE_UNA_CLAVE_LARGA_Y_ALEATORIA"

DB_SERVER=localhost
DB_PORT=1433
DB_NAME=SimuladorBancarioDB
DB_USER=simulador_app
DB_PASSWORD="COLOQUE_LA_CONTRASENA_SQL"
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

EMAIL_USER="correo.remitente@gmail.com"
EMAIL_APP_PASSWORD="CONTRASENA_DE_APLICACION_DE_GOOGLE"
EMAIL_FROM_NAME="Simulador Bancario"

MFA_DEBUG=false
```

`EMAIL_APP_PASSWORD` no es la contraseña normal de Gmail. Debe ser una contraseña de aplicación generada por Google.

Instale y ejecute:

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

Resultado esperado:

```text
Conexión a SQL Server establecida correctamente
Esquema de base de datos actualizado
Servidor WebSocket inicializado
Servidor ejecutándose en http://localhost:3000
```

## 3. Configurar el frontend

En otra terminal:

```powershell
Copy-Item frontend\.env.example frontend\.env
cd frontend
npm.cmd install
npm.cmd run dev
```

El archivo `frontend/.env` debe contener:

```env
PORT=4000
BACKEND_WS_URL=ws://localhost:3000
SESSION_SECRET=COLOQUE_UNA_CLAVE_LARGA_Y_DIFERENTE
NODE_ENV=development
```

Abra:

```text
http://localhost:4000
```

## 4. Crear el primer administrador

1. Registre normalmente un usuario desde el frontend.
2. Abra `database/05_promote_user_to_admin.sql`.
3. Cambie el correo y ejecute el script.
4. Cierre sesión y vuelva a iniciar para obtener un JWT con el nuevo rol.

## 5. Flujo recomendado para la demostración

1. Registrar un cliente.
2. Iniciar sesión y validar el MFA.
3. Enviar una solicitud de cuenta.
4. Iniciar como administrador y aprobar la solicitud.
5. Aplicar un depósito en efectivo desde el módulo administrativo.
6. Crear o aprobar una segunda cuenta.
7. Realizar una transferencia por IBAN.
8. Realizar un pago de servicio.
9. Mostrar el comprobante, historial y bitácora.
10. Probar retiro, bloqueo de cuenta y reversión.

## Pruebas

Pruebas unitarias del backend:

```powershell
cd backend
npm.cmd test -- --runInBand --testPathIgnorePatterns=tests/integration
```

Las pruebas de integración requieren una base configurada y cuentas de prueba:

```powershell
npm.cmd run test:integration
```

## Estructura principal

```text
.
├── backend/
│   ├── src/
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   ├── views/
│   ├── .env.example
│   └── package.json
├── database/
├── .github/workflows/ci.yml
└── README.md
```

## Antes de subir a GitHub

No incluya estos elementos:

```text
backend/.env
frontend/.env
backend/node_modules/
frontend/node_modules/
archivos .bak de SQL Server
```

El `.gitignore` ya los excluye. Revise el cambio antes de hacer el commit:

```powershell
git status
git add .
git commit -m "Integra simulador bancario, solicitudes y scripts SQL"
git push
```

## Aviso

Este proyecto es un simulador académico. No debe utilizarse como plataforma bancaria real sin una revisión de seguridad, infraestructura, cumplimiento normativo y pruebas adicionales.
