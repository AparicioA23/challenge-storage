# syntax=docker/dockerfile:1

# --- Etapa 1: verificación (tipos + pruebas) con dependencias de desarrollo ---
FROM node:22-alpine AS verify
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
COPY test ./test
RUN pnpm typecheck && pnpm test

# --- Etapa 2: runtime sin dependencias, usuario no root ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=verify --chown=node:node /app/package.json ./
COPY --from=verify --chown=node:node /app/src ./src
USER node
EXPOSE 4000
CMD ["node", "src/server.ts"]
