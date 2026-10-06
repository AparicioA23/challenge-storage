# storage-auth-backend

API mínima de autenticación para el reto de almacenamiento en navegadores. Expone dos endpoints: uno que emite un token (JWT HS256) y lo entrega en una cookie `HttpOnly`, y otro que verifica que el token de esa cookie tenga firma válida y no esté vencido.

No tiene dependencias de runtime: usa `node:http` y `node:crypto`, y Node ejecuta el TypeScript directamente (type stripping). TypeScript y `@types/node` solo se usan para el chequeo de tipos.

## Requisitos

- Node.js 22.18 o superior.
- pnpm (vía `corepack enable`).

## Cómo correrlo

```bash
cd backend
corepack enable
pnpm install
cp .env.example .env   # completar JWT_SECRET, DEMO_USERNAME y DEMO_PASSWORD
pnpm dev               # o pnpm start
```

Generar un secreto:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

| Variable | Obligatoria | Default | Descripción |
|---|---|---|---|
| `JWT_SECRET` | sí | — | Secreto HMAC, mínimo 32 caracteres. |
| `DEMO_USERNAME` | sí | — | Usuario aceptado por el login. |
| `DEMO_PASSWORD` | sí | — | Contraseña aceptada por el login. |
| `TOKEN_TTL_SECONDS` | no | `300` | Vigencia del token en segundos. |
| `PORT` | no | `4000` | Puerto HTTP (el frontend de Vite usa el 3000). |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Origen permitido por CORS (con credenciales). |
| `COOKIE_SECURE` | no | `true` | Marca la cookie del token como `Secure`. Chrome y Firefox la aceptan en `http://localhost`; para Safari en local usar `false`. |

## Endpoints

### `POST /api/auth/login`

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "demo", "password": "demo123" }
```

Respuesta `200`:

```http
Set-Cookie: auth_token=<jwt>; Path=/api/auth; Max-Age=300; SameSite=Strict; HttpOnly; Secure
```

```json
{ "expiresAt": "2026-10-05T18:03:54.000Z", "expiresIn": 300 }
```

El token no viaja en el cuerpo: solo existe en la cookie, que JavaScript no puede leer. `Max-Age` coincide con la vigencia del token, así que cookie y token vencen al mismo tiempo. `expiresAt` le permite al frontend saber hasta cuándo dura la sesión sin acceder al token.

Errores: `400` (cuerpo inválido o JSON mal formado), `401` (credenciales incorrectas), `413` (cuerpo mayor a 10 KB), `415` (Content-Type distinto de `application/json`).

### `GET /api/auth/validate`

El navegador envía la cookie automáticamente; el frontend solo debe hacer la petición con `credentials: "include"`:

```http
GET /api/auth/validate
Cookie: auth_token=<jwt>
```

Respuesta `200`:

```json
{ "valid": true, "subject": "demo", "expiresAt": "2026-10-05T18:03:54.000Z" }
```

Errores `401`, distinguibles por el campo `type`. En los casos de token inválido o vencido la respuesta también borra la cookie (`Max-Age=0`):

| `type` | Causa |
|---|---|
| `/problems/missing-token` | No llegó la cookie `auth_token` (no hubo login o ya venció). |
| `/problems/invalid-token` | Token mal formado, firma inválida o algoritmo distinto de HS256. |
| `/problems/expired-token` | Token vencido. Incluye `expiredAt`. |

Todos los errores siguen RFC 7807 (`application/problem+json`).

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` | Levanta el servidor con recarga al guardar. |
| `pnpm start` | Levanta el servidor. |
| `pnpm typecheck` | Chequea tipos con `tsc` (sin emitir). |
| `pnpm test` | Corre las pruebas con `node:test`. |

## Docker

```bash
docker build -t storage-auth-backend .
docker run --rm -p 4000:4000 --env-file .env storage-auth-backend
```

La imagen corre como usuario no root y la etapa de build ejecuta el chequeo de tipos y las pruebas.

## Estructura

```
src/
  server.ts                    composición de dependencias y arranque
  config.ts                    lectura y validación de variables de entorno
  logger.ts                    logs estructurados en JSON
  auth/
    authTypes.ts               contratos (TokenService, CredentialsVerifier, Authenticator)
    authService.ts             caso de uso: login y validación
    hmacJwtTokenService.ts     emisión y verificación de JWT HS256 con expiración
    staticCredentialsVerifier.ts  verificación de credenciales en tiempo constante
    credentialsParser.ts       validación del cuerpo del login
    authCookie.ts              emisión, lectura y borrado de la cookie HttpOnly del token
    authController.ts          handlers HTTP de los dos endpoints
  http/
    app.ts                     router, CORS y manejo de errores
    json.ts                    lectura de JSON con límite de tamaño y respuestas
    problems.ts                catálogo de errores RFC 7807
    cors.ts                    encabezados CORS
    cookies.ts                 serialización y lectura de cookies
```

## Limitaciones conocidas

- Un solo usuario de demostración configurado por variables de entorno; no hay base de datos.
- No hay revocación de tokens ni refresh token: un token es válido hasta que vence.
- No hay endpoint de logout: como la cookie es `HttpOnly`, el frontend no puede borrarla; se elimina al vencer o cuando la validación la rechaza.
- La protección CSRF se apoya en `SameSite=Strict` y en que el login exige `Content-Type: application/json` (fuerza preflight CORS). Si se agregan endpoints que modifiquen estado, conviene sumar un token anti-CSRF.
