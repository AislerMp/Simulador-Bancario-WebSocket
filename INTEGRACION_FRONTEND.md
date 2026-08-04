# Contrato frontend–backend

El frontend usa:

```javascript
sendSocketRequest(type, payload, token)
```

## Operaciones públicas

| Tipo | Payload |
|---|---|
| `REGISTER` | `{ nombre, correo, password }` |
| `LOGIN` | `{ correo, password }` |
| `VERIFY_MFA` | `{ idUsuario, codigoMfa }` |
| `REQUEST_PASSWORD_RESET` | `{ correo }` |
| `RESET_PASSWORD` | `{ idUsuario, codigo, nuevaPassword }` |

## Cuentas

| Tipo | Payload | Rol |
|---|---|---|
| `GET_CUENTAS_USUARIO` | `{}` | autenticado |
| `GET_CUENTA` | `{ idCuenta }` | propietario o administrador |
| `GET_CUENTA_POR_NUMERO` | `{ numeroCuenta }` | autenticado |
| `GET_TODAS_CUENTAS` | `{}` | administrador |
| `CREATE_CUENTA` | `{ idUsuario }` | administrador |
| `UPDATE_ESTADO_CUENTA` | `{ idCuenta, idUsuario, estadoCuenta }` | administrador |

## Solicitudes de apertura

| Tipo | Payload | Rol |
|---|---|---|
| `SOLICITAR_CUENTA` | `{ tipoCuenta }` | cliente |
| `GET_MIS_SOLICITUDES` | `{}` | cliente |
| `GET_SOLICITUDES_PENDIENTES` | `{}` | administrador |
| `APROBAR_SOLICITUD_CUENTA` | `{ idSolicitud }` | administrador |
| `RECHAZAR_SOLICITUD_CUENTA` | `{ idSolicitud, observacion }` | administrador |

## Transacciones

| Tipo | Payload | Rol |
|---|---|---|
| `TRANSFERENCIA` | `{ idCuentaOrigen, idCuentaDestino, monto }` | propietario de la cuenta origen |
| `PAGO_SERVICIO` | `{ idCuentaOrigen, nombreServicio, referenciaServicio, monto }` | propietario de la cuenta origen |
| `DEPOSITO_EFECTIVO` | `{ idCuentaDestino, monto }` | administrador |
| `RETIRO_EFECTIVO` | `{ idCuentaOrigen, monto }` | administrador |
| `GET_TRANSACCIONES_CUENTA` | `{ idCuenta }` | propietario o administrador |
| `REVERTIR_TRANSACCION` | `{ idTransaccionOriginal }` | administrador |

## Bitácora

| Tipo | Payload | Rol |
|---|---|---|
| `GET_MOVIMIENTOSXUSUARIO` | `{ idUsuario }` | mismo usuario o administrador |
| `GET_MOVIMIENTOS` | `{}` | administrador |

El token no se toma de campos enviados por el navegador. Se conserva en la sesión del frontend después del MFA y se adjunta a las operaciones protegidas.
