# Versión local completa

Esta copia incluye los archivos `.env` locales y las carpetas `node_modules` para ejecutar el proyecto sin instalar nuevamente las dependencias.

## Importante

- No subir esta carpeta directamente a GitHub.
- No compartir los archivos `.env` ni mostrarlos en capturas.
- Si alguna credencial se expuso, revocarla y generar una nueva.
- Para compartir el proyecto, usar la versión preparada para GitHub que excluye credenciales y dependencias.

## Ejecución

Backend:

```powershell
cd backend
npm.cmd run dev
```

Frontend, en otra terminal:

```powershell
cd frontend
npm.cmd run dev
```

Abrir `http://localhost:4000`.
