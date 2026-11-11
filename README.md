# Educa360 Web Frontend

SPA (Single Page Application) para la gestión académica del Colegio Nuestra Señora de
Monserrat. Consume la API REST de
[`educa360-web-backend`](https://github.com/franco-ugarte/educa360-web-backend).

Este README cubre solo el arranque técnico del frontend. El dominio, los endpoints y las
reglas de negocio viven en el `docs/CONTEXT.md` del backend.

## Stack

| Pieza | Versión |
|---|---|
| React | 19 |
| Vite | 8 |
| Tailwind CSS | 3.4 |
| React Router | 7 |
| Axios | 1.21 |
| Recharts | 3.10 |
| Lucide React | 1.70 |
| STOMP (`@stomp/stompjs`) | 7.5 |

## Requisitos

- **Node.js 20+** (`node -v` debe reportar 20 o superior).
- **npm** 10+ (viene con Node).
- **Docker** con **Docker Compose** para levantar el backend y PostgreSQL.

## Arranque rápido

```bash
npm install
cp .env.example .env
```

Arranca el backend primero (ver su README) y luego el frontend:

```bash
npm run dev
```

| Servicio | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| API (backend) | http://localhost:8080/api/v1 |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |

Las cuentas de prueba están en `docs/CREDENCIALES.md` del repositorio backend.

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). El archivo `.env`
**no se versiona**.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_API_URL` | Sí | URL base de la API, sin `/v1` (por defecto `http://localhost:8080/api`) |
| `VITE_WS_URL` | No | URL del broker STOMP para notificaciones (por defecto `http://localhost:8080/ws`) |

> El prefijo `/v1` lo agrega el cliente HTTP (`src/services/api.js`), igual que
> la documentación del backend.

## Scripts

```bash
npm run dev      # servidor de desarrollo con HMR (http://localhost:5173)
npm run build    # type-check (tsc -b) + build de producción en dist/
npm run preview  # sirve el build de producción
npm run lint     # ESLint
```

## Estructura

```text
src/
├── api/           # helpers de mapeo de datos
├── components/    # ProtectedRoute y UI compartida (panel, ui)
├── hooks/         # hooks reutilizables
├── pages/         # una carpeta por rol, con sus vistas
│   ├── AdminPage/       # usuarios, catálogo, métricas, comunicados, reportes
│   ├── SecretariaPage/  # matrículas, alumnos, familias, tickets
│   ├── DocentePage/     # cursos, asistencia, planificación, materiales
│   ├── EstudiantePage/  # cursos, notas, asistencia, boleta
│   ├── ApoderadoPage/   # hijos, notas, asistencia, tickets
│   ├── LoginPage/       # autenticación
│   └── RolePlaceholder/ # módulo en construcción
├── services/      # cliente HTTP (axios) y socket STOMP
├── styles/        # estilos globales del panel
└── utils/         # formateadores y utilidades
```

Cada módulo de rol sigue la misma convención:

```text
pages/<Rol>Page/
├── <Rol>Page.jsx      # layout (rail de navegación + header + Outlet)
├── <rol>styles.css    # estilos específicos del rol
├── <rol>Utils.js      # helpers del rol
└── views/             # una vista por sección del rail
```

## Rutas y roles

La aplicación es un SPA con rutas protegidas. El rol se toma del token JWT, no de
parámetros de la URL.

| Ruta | Rol | Módulo |
|---|---|---|
| `/login` | público | Autenticación |
| `/admin/*` | `ADMIN` | Panel de administración |
| `/secretaria` | `SECRETARIA` | Registro de alumnos y familias |
| `/docente` | `DOCENTE` | Cursos, asistencia y planificación |
| `/estudiante` | `ESTUDIANTE` | Seguimiento académico personal |
| `/apoderado` | `APODERADO` | Seguimiento de hijos |

`ProtectedRoute` (`src/components/ProtectedRoute.jsx`) valida que exista sesión y que
el rol del usuario coincida con el de la zona. Si no, redirige a `/login`.

## Autenticación

- Login: `POST /api/v1/auth/login` con `{ email, password }`.
- El token JWT y el usuario se guardan en `localStorage` bajo las claves
  `educa360.token` y `educa360.user` (ver `src/services/api.js`).
- El interceptor de Axios adjunta `Authorization: Bearer <token>` a cada petición y
  ante un `401` limpia la sesión y redirige al login.

## Notificaciones en tiempo real

`src/services/notificationsSocket.js` conecta el panel al broker STOMP del backend.
El JWT viaja en el header `Authorization` del frame `CONNECT` y el cliente se suscribe
a:

```text
/user/queue/notificaciones
```

Las notificaciones también quedan persistidas en el backend y se consultan por REST
en `/api/v1/notificaciones`.

## Backend

Este frontend **no** incluye base de datos ni servidor. Necesitas el backend
levantado:

```bash
cd ../educa360-web-backend
cp .env.example .env
docker compose up -d --build
```

Comandos útiles:

```bash
docker compose logs -f backend   # logs del backend
docker compose ps                # estado de los servicios
docker compose down              # detiene los contenedores (conserva la BD)
```

Si tienes un PostgreSQL local que ocupa el puerto `5432`, publica el de Docker en
otro puerto:

```bash
POSTGRES_PORT=5433 docker compose up -d
```

## Errores

El backend responde con el cuerpo `ApiError`:

```json
{
  "timestamp": "2026-10-14T10:00:00",
  "status": 409,
  "error": "Conflict",
  "message": "El email ya está registrado",
  "path": "/api/v1/auth/register",
  "fields": null
}
```

El cliente usa `message` para el mensaje visible al usuario y `fields` para el
detalle por campo en los errores de validación (`400`).

## Convenciones

- Prefijo de la API: `/api/v1` (lo añade el cliente, no lo escribas en las rutas).
- Autenticación: `Authorization: Bearer <token>`.
- Fechas y hora en ISO-8601.
- Los nombres de dominio van en español; el código técnico en inglés.
- Los tokens de color viven en `tailwind.config.js` (`brand.*`) y derivan de la
  identidad visual de la app móvil.

## Despliegue

```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ localmente
```

`dist/` es estático: sirve en cualquier hosting (Nginx, Netlify, Vercel, Cloudflare
Pages). Configura las variables `VITE_API_URL` y `VITE_WS_URL` en el panel del
hosting antes de construir, y declara `/admin/*`, `/secretaria`, `/docente`,
`/estudiante` y `/apoderado` como reescrituras a `index.html` (SPA).
