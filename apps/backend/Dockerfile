# syntax=docker/dockerfile:1

# ---- deps: full install, including devDependencies, for the Nest build ------
FROM node:22-alpine AS deps
WORKDIR /app
# .npmrc carries legacy-peer-deps=true, which this dependency tree needs.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# ---- build: compile TypeScript to dist/ -------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json .npmrc nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- prod-deps: runtime dependencies only -----------------------------------
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# wget is used by the container healthcheck below; it ships with busybox on
# Alpine, so there is nothing extra to install.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

# Never run the API as root.
USER node

EXPOSE 4000

# Docker's own liveness view of the container. Caddy checks the same endpoint
# over the network; this one catches a process that is up but not serving.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

CMD ["node", "dist/main"]
