# Simulador Bancario con Socket

Este proyecto contiene un backend y un frontend para un simulador bancario basado en WebSockets.

## Estructura del proyecto

- backend/: API y lógica del servidor con Express y Socket.IO/WebSocket
- frontend/: interfaz de usuario del cliente

## Requisitos

- Node.js 18 o superior
- npm o pnpm

## Instalación

1. Clona el repositorio
2. Instala las dependencias del backend:
   ```bash
   cd backend
   npm install
   ```
3. Inicia el servidor:
   ```bash
   npm run dev
   ```
4. Abre el frontend en tu navegador o sirve los archivos estáticos desde la carpeta frontend

## Variables de entorno

Crea un archivo .env dentro de backend con las variables necesarias para tu configuración local, por ejemplo:

```env
JWT_SECRET=tu_secreto
PORT=3000
```

## Scripts disponibles

En la carpeta backend puedes usar:

- npm run dev: inicia el servidor en modo desarrollo
- npm run start: inicia el servidor en producción
- npm test: ejecuta las pruebas

## Notas

Este repositorio está preparado para ser subido a GitHub con un archivo .gitignore y documentación básica.
