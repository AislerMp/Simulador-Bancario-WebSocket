# Visión general del sistema

```text
Navegador
   │ HTTP
   ▼
Frontend Express + EJS :4000
   │ WebSocket
   ▼
Backend Node.js + ws :3000
   │ consultas parametrizadas
   ▼
SQL Server / SimuladorBancarioDB
```

## Frontend

- Renderiza vistas EJS.
- Conserva el usuario y JWT dentro de `express-session`.
- Envía solicitudes al backend mediante `socketClient.js`.
- Nunca accede directamente a SQL Server.

## Backend

- Enruta mensajes por su propiedad `type`.
- Verifica JWT y roles.
- Ejecuta validaciones de negocio.
- Coordina repositorios y transacciones SQL.
- Envía MFA y recuperación mediante Gmail/Nodemailer.

## Datos principales

- `Usuario`
- `Cuenta_Bancaria`
- `Solicitud_Cuenta`
- `Codigo_MFA`
- `Password_Reset`
- `Transaccion`
- `Bitacora`

## Reglas importantes

- El registro público siempre crea un cliente.
- El cliente solicita una cuenta; el administrador la aprueba o rechaza.
- Los depósitos y retiros en efectivo son administrativos.
- Las transferencias debitan una cuenta propia y acreditan un IBAN destino.
- Las cuentas bloqueadas o inactivas no pueden operar.
- Una transacción solamente puede revertirse una vez.
