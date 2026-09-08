# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/ops/package.json apps/ops/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/snapshot/package.json packages/snapshot/package.json
COPY tools/data/package.json tools/data/package.json
COPY tools/ingestion/package.json tools/ingestion/package.json
RUN npm ci --ignore-scripts

COPY apps/ops apps/ops
COPY tools/ingestion tools/ingestion
RUN npm run build --workspace @viva/ingestion-tools \
 && npm run build --workspace @viva/ops \
 && npm prune --omit=dev

FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    OPS_HOST=0.0.0.0 \
    OPS_PORT=3100 \
    LOG_LEVEL=info \
    REPOSITORY_ROOT=/app \
    INGESTION_REGISTRY_PATH=/app/data/source/ingestion/source-registry.json \
    INGESTION_STAGING_DIRECTORY=/app/data/staging/ops \
    DATA_REFRESH_EXECUTE=false
WORKDIR /app
COPY --from=build --chown=node:node /workspace/node_modules node_modules
COPY --from=build --chown=node:node /workspace/apps/ops/package.json apps/ops/package.json
COPY --from=build --chown=node:node /workspace/apps/ops/dist apps/ops/dist
COPY --from=build --chown=node:node /workspace/tools/ingestion/package.json tools/ingestion/package.json
COPY --from=build --chown=node:node /workspace/tools/ingestion/dist tools/ingestion/dist
COPY --chown=node:node data/source/ingestion data/source/ingestion
RUN mkdir -p /app/data/staging/ops && chown -R node:node /app/data/staging
USER node
EXPOSE 3100
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/ops/dist/server.js"]
