# 🎬 Visión General del Sistema

## El Simulador Bancario Completo

Este documento presenta una visión holística de cómo frontend y backend trabajan juntos.

---

## 🏛️ Arquitectura General

```
                    ┌──────────────────────────────────────┐
                    │      🌐 CLIENTE (Navegador)          │
                    │                                      │
                    │    http://localhost:3000             │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │    Vistas EJS (HTML)           │  │
                    │  │  - Login, Registro, MFA        │  │
                    │  └────────────────────────────────┘  │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │  Express Server (Node.js)      │  │
                    │  │  - Routes                      │  │
                    │  │  - Controllers                 │  │
                    │  │  - Middleware                  │  │
                    │  └────────────────────────────────┘  │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │  WebSocketService              │  │
                    │  │  (Conexión Persistente)        │  │
                    │  └────────────────────────────────┘  │
                    └───────────────┬──────────────────────┘
                                    │
                    WebSocket conn  │  (ws://localhost:3000)
                   (abierta 24/7)   │
                                    │
                    ┌───────────────▼──────────────────────┐
                    │    🖥️ SERVIDOR (Backend)            │
                    │                                      │
                    │   WebSocket Server (Node.js)        │
                    │   :3000                             │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │  Socket Server                 │  │
                    │  │  - Message Router              │  │
                    │  │  - Event Handlers              │  │
                    │  └────────────────────────────────┘  │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │  Services                      │  │
                    │  │  - authService                 │  │
                    │  │  - mfaService                  │  │
                    │  │  - emailService                │  │
                    │  └────────────────────────────────┘  │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │  Database                      │  │
                    │  │  - usuarios                    │  │
                    │  │  - codigos_mfa                 │  │
                    │  └────────────────────────────────┘  │
                    └──────────────────────────────────────┘
```

---

## 🔄 Ciclo de Vida: Usuarios Nuevos

### Fase 1: Registro

```
1. Usuario escribe URL
   ↓
2. http://localhost:3000
   ↓
3. Frontend renderiza login.ejs
   ↓
4. Usuario hace click en "Registrarse"
   ↓
5. GET /register
   ↓
6. Renderiza register.ejs
   ↓
7. Usuario completa:
   - Nombre
   - Email
   - Contraseña
   ↓
8. POST /register (submit del formulario)
   ↓
9. handleRegister() en authController.js
   ├─ Valida datos
   ├─ Emite REGISTER_REQUEST por WebSocket
   ├─ Backend recibe y valida
   ├─ Backend crea usuario en BD
   ├─ Backend retorna respuesta
   └─ Frontend renderiza register-success.ejs
   ↓
10. Usuario ve: "¡Registro exitoso! Puedes iniciar sesión"
    ↓
11. Usuario hace click en "Ir al Login"
```

**Mensajes WebSocket:**
```javascript
// Cliente envía
{
  type: "REGISTER_REQUEST",
  payload: { nombre: "Juan", correo: "juan@mail.com", password: "123456" },
  requestId: 1
}

// Servidor responde
{
  type: "REGISTER_RESPONSE",
  data: { id_usuario: 5, nombre: "Juan", correo: "juan@mail.com" },
  requestId: 1
}
```

---

### Fase 2: Login

```
1. Usuario accede http://localhost:3000/login
   ↓
2. Renderiza login.ejs
   ↓
3. Usuario ingresa:
   - Email
   - Contraseña
   ↓
4. POST /login
   ↓
5. handleLogin() valida datos
   ↓
6. Emite LOGIN_REQUEST por WebSocket
   ↓
7. Backend:
   ├─ Verifica email existe
   ├─ Valida contraseña (bcrypt compare)
   ├─ Genera código MFA (6 dígitos)
   ├─ Guarda código hasheado en BD
   ├─ Envía email con código
   └─ Retorna datos del usuario
   ↓
8. Frontend guarda en req.session.loginData
   ↓
9. Frontend redirecciona a /mfa
   ↓
10. renderiza mfa.ejs
    ↓
11. Usuario ve: "Hemos enviado un código a tu email"
```

**Mensajes WebSocket:**
```javascript
// Cliente
{
  type: "LOGIN_REQUEST",
  payload: { correo: "juan@mail.com", password: "123456" },
  requestId: 2
}

// Servidor
{
  type: "LOGIN_RESPONSE",
  data: {
    id_usuario: 5,
    nombre: "Juan",
    correo: "juan@mail.com",
    rol: "CLIENTE"
  },
  requestId: 2
}
```

---

### Fase 3: Verificación MFA

```
1. Usuario recibe email con código (ej: 483921)
   ↓
2. Usuario ingresa código en mfa.ejs
   ↓
3. POST /mfa
   ↓
4. handleMfaVerification() valida:
   ├─ Código tiene 6 dígitos
   └─ Hay req.session.loginData
   ↓
5. Emite VERIFY_MFA_REQUEST por WebSocket
   ↓
6. Backend:
   ├─ Obtiene código válido de BD
   ├─ Compara hash del código (bcrypt compare)
   ├─ Verifica no esté expirado (5 minutos)
   ├─ Marca código como utilizado
   ├─ Genera JWT
   └─ Retorna token + usuario
   ↓
7. Frontend:
   ├─ Guarda usuario en req.session.user
   ├─ Guarda token en req.session.token
   ├─ Limpia req.session.loginData
   └─ Redirecciona a /dashboard
   ↓
8. Usuario está autenticado ✅
```

**Mensajes WebSocket:**
```javascript
// Cliente
{
  type: "VERIFY_MFA_REQUEST",
  payload: { idUsuario: 5, codigoMfa: "483921" },
  requestId: 3
}

// Servidor
{
  type: "VERIFY_MFA_RESPONSE",
  data: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    user: {
      id_usuario: 5,
      nombre: "Juan",
      correo: "juan@mail.com",
      rol: "CLIENTE"
    }
  },
  requestId: 3
}
```

---

### Fase 4: Dashboard Protegido

```
1. Usuario accede /dashboard
   ↓
2. Middleware isAuthenticated verifica:
   ├─ req.session existe
   ├─ req.session.user existe
   ├─ Usuario está autenticado
   ↓
3. showDashboard() renderiza dashboard/home.ejs
   ↓
4. Usuario ve:
   ├─ Su nombre
   ├─ Su email
   ├─ Su rol
   ├─ Información de seguridad (MFA ✅)
   ├─ Estado del sistema (Conectado ✅)
   └─ Botón de Cerrar Sesión
   ↓
5. Usuario es completamente autenticado
```

**Estado de la sesión:**
```javascript
req.session = {
  user: {
    id_usuario: 5,
    nombre: "Juan",
    correo: "juan@mail.com",
    rol: "CLIENTE",
    activo: true
  },
  token: "eyJ...",
  cookie: {
    path: "/",
    httpOnly: true,
    secure: false,
    maxAge: 86400000  // 24 horas
  }
}
```

---

### Fase 5: Logout

```
1. Usuario hace click "Cerrar Sesión"
   ↓
2. GET /logout
   ↓
3. handleLogout() ejecuta:
   req.session.destroy()
   ↓
4. Sesión se elimina
   ↓
5. Redirecciona a /login
   ↓
6. Usuario desautenticado
```

---

## 🔐 Flujo de Datos Sensibles

```
┌─────────────────────────────────────────────────────┐
│ SEGURIDAD EN CADA CAPA                              │
└─────────────────────────────────────────────────────┘

USUARIO
│ (ingresa contraseña en cliente)
├─ VALIDACIÓN EN CLIENTE (helpers.js)
│  ├─ Mínimo 6 caracteres
│  └─ No está vacía
│
▼
ENVÍO POR WEBSOCKET
├─ JSON envía credenciales (no cifrado, pero es local)
└─ Connection cierra si desconecta
│
▼
SERVIDOR (backend)
├─ VALIDACIÓN 2
│  ├─ Email válido
│  └─ Contraseña ingresada vs hash en BD
│
├─ HASH CON BCRYPT
│  ├─ Almacena contraseña hasheada (nunca en texto)
│  └─ Compara hash nuevamente
│
├─ GENERA MFA
│  ├─ Código aleatorio de 6 dígitos
│  ├─ Hashea código (bcrypt)
│  ├─ Almacena hash en BD
│  └─ Envía código por email
│
├─ VERIFICA MFA
│  ├─ Usuario ingresa código
│  ├─ Backend compara con hash en BD
│  └─ Si coincide: Genera JWT
│
└─ GENERA JWT
   ├─ Contiene: { idUsuario, rol, nombre, correo }
   ├─ Firmado con JWT_SECRET
   └─ Expira en 1 hora
│
▼
CLIENTE (frontend)
├─ GUARDA EN SESIÓN
│  ├─ req.session.user
│  └─ req.session.token
│
├─ COOKIE SEGURA
│  ├─ HttpOnly (no accesible desde JS)
│  ├─ Secure en producción (solo HTTPS)
│  └─ Expira en 24 horas
│
└─ PROTECCIÓN DE RUTAS
   ├─ isAuthenticated() verifica sesión
   └─ Redirecciona si no autenticado
```

---

## 📊 Tabla de Componentes

| Componente | Ubicación | Función | Puerta |
|-----------|-----------|---------|---------|
| Express Server | `frontend/src/server.js` | Sirve vistas HTTP | 3000 |
| WebSocket Client | `frontend/src/services/WebSocketService.js` | Conecta a backend | 3000 |
| EJS Views | `frontend/views/` | Renderiza HTML dinámico | - |
| Controllers | `frontend/src/controllers/` | Lógica de rutas | - |
| Middleware | `frontend/src/middleware/` | Protege rutas | - |
| Routes | `frontend/src/routes/` | Define endpoints | - |
| WebSocket Server | `backend/src/websocket/socketServer.js` | Recibe conexiones | 3000 |
| Services | `backend/src/services/` | Lógica de negocio | - |
| Database | MySQL | Almacena datos | 3306 |
| Email | SendGrid/SMTP | Envía códigos MFA | - |

---

## 🎯 Estados y Transiciones

```
┌──────────────┐
│   NO AUTH    │  (Usuario nuevo o cerró sesión)
└──────┬───────┘
       │
       │ POST /register o POST /login
       │
       ▼
┌──────────────┐
│   LOGIN_DATA │  (Esperando MFA)
└──────┬───────┘
       │
       │ POST /mfa (código correcto)
       │
       ▼
┌──────────────┐
│ AUTENTICADO  │  (Acceso a dashboard)
└──────┬───────┘
       │
       │ GET /logout
       │
       ▼
┌──────────────┐
│   NO AUTH    │  (Sesión destruida)
└──────────────┘
```

---

## 💾 Almacenamiento de Datos

### Cliente (Sesión Express)
```javascript
req.session = {
  user: {},        // Datos del usuario autenticado
  token: "",       // JWT (para futuras requests)
  loginData: {}    // Datos temporales durante MFA
}
```

### Servidor (Base de Datos)
```sql
usuarios
├─ id_usuario
├─ nombre
├─ correo
├─ password_hash
├─ rol
└─ activo

codigos_mfa
├─ id_codigo_mfa
├─ id_usuario (FK)
├─ codigo_hash
├─ fecha_expiracion
├─ utilizado
└─ fecha_creacion
```

---

## 📡 Protocolo WebSocket

### Estructura de Mensaje

```javascript
// CLIENTE → SERVIDOR
{
  type: "NOMBRE_REQUEST",      // Tipo de petición
  payload: { },                // Datos
  requestId: 1                 // ID único para correlación
}

// SERVIDOR → CLIENTE
{
  type: "NOMBRE_RESPONSE",     // Respuesta al tipo
  data: { },                   // Resultado
  error: { code: "", message: "" } || null,
  requestId: 1                 // Mismo ID que request
}
```

### Timeouts
- Cliente espera respuesta: **30 segundos**
- MFA valida por: **5 minutos**
- Sesión dura: **24 horas**

---

## 🎨 Experiencia del Usuario

### Flujo Visual

```
┌─────────────┐
│ login.ejs   │  Ingresa email + pass
└────┬────────┘
     │
     ▼
┌─────────────┐
│  mfa.ejs    │  Ingresa código de 6 dígitos
└────┬────────┘
     │
     ▼
┌─────────────┐
│ home.ejs    │  Dashboard con info de usuario
└─────────────┘
```

### Validaciones Visuales

```
login.ejs
├─ Campo email requerido
├─ Campo password requerido
├─ Muestra error si fallan credenciales
└─ Muestra estado de conexión

mfa.ejs
├─ Campo solo acepta 6 dígitos
├─ Muestra email donde se envió código
├─ Muestra error si código inválido/expirado
└─ Timer visual (5 minutos)

home.ejs
├─ Muestra nombre del usuario
├─ Muestra email verificado
├─ Indica MFA habilitado ✅
└─ Botón de cerrar sesión
```

---

## 🚀 Escalabilidad Futura

Sin cambiar la arquitectura base, se pueden agregar:

```
├─ Más funcionalidades bancarias
│  ├─ Transferencias
│  ├─ Transacciones
│  └─ Historial
│
├─ Más vistas
│  ├─ Perfil de usuario
│  ├─ Configuración
│  └─ Notificaciones
│
├─ Más servicios
│  ├─ Notificaciones en tiempo real
│  ├─ Chat de soporte
│  └─ Reportes
│
└─ Más seguridad
   ├─ Rate limiting
   ├─ CSRF tokens
   └─ 2FA biométrica
```

---

**🎉 ¡Listo! El sistema está completo y funcional.**

Ahora puedes:
1. Instalar dependencias
2. Configurar .env
3. Ejecutar ambos servidores
4. ¡Usar el simulador bancario!
