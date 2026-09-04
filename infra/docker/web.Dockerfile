# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/snapshot/package.json packages/snapshot/package.json
COPY tools/data/package.json tools/data/package.json
RUN npm ci --ignore-scripts

COPY apps/web apps/web
RUN npm run typecheck --workspace @viva/web \
 && npm run build --workspace @viva/web

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/health/live >/dev/null || exit 1
