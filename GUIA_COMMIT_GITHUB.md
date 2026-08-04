# Guía rápida para subir el proyecto a GitHub

## 1. Copiar las variables locales

Los archivos `.env` reales no vienen incluidos. Créelos a partir de los ejemplos:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

## 2. Confirmar que no hay secretos

```powershell
git status --ignored
```

`backend/.env`, `frontend/.env` y `node_modules` deben aparecer como ignorados y nunca como archivos por agregar.

## 3. Preparar el commit

```powershell
git init
git branch -M main
git add .
git status
git commit -m "Integra simulador bancario por WebSocket y base de datos"
```

## 4. Vincular el repositorio

```powershell
git remote add origin URL_DEL_REPOSITORIO
git push -u origin main
```

## 5. Si un `.env` fue agregado anteriormente

Quitarlo del seguimiento sin borrarlo de la computadora:

```powershell
git rm --cached backend/.env frontend/.env
git commit -m "Elimina credenciales del repositorio"
```

Si una contraseña o clave ya fue publicada, debe cambiarse. Borrarla en un commit posterior no elimina el secreto del historial.
