# CityFix API

API de ejemplo para la app CityFix usando MongoDB.

## Instalación

```bash
cd backend
npm install
```

## Configuración

La API espera una cadena de conexión a MongoDB en la variable de entorno `MONGODB_URI`.

Si usas MongoDB Atlas crea un archivo `.env` en la carpeta `backend/` y pega la URL de conexión (reemplaza credenciales):

```text
# Ejemplo usando MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority
PORT=3001
```

Puedes usar el archivo `.env.example` como plantilla.

## Ejecución

```bash
npm start
```

## Endpoints

- `GET /api/reports`
- `POST /api/reports`
- `GET /api/reports/:id`
- `PATCH /api/reports/:id`
- `POST /api/reports/upload`
- `POST /api/auth/login`
- `POST /api/auth/register`
