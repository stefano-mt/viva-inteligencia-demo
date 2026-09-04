# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/snapshot/package.json packages/snapshot/package.json
COPY tools/data/package.json tools/data/package.json
RUN npm ci --ignore-scripts

COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/web/scripts apps/web/scripts
COPY packages packages
COPY tools tools
COPY data/source data/source
RUN npm run data:build \
 && npm run build:packages \
 && npm run build --workspace @viva/api \
 && npm prune --omit=dev

FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3000 \
    LOG_LEVEL=info \
    CORS_ORIGIN=same-origin \
    SNAPSHOT_PATH=/app/data/generated/viva-platform-demo.json \
    SNAPSHOT_SCHEMA_PATH=/app/packages/contracts/schemas/demo-v2.schema.json
WORKDIR /app
COPY --from=build --chown=node:node /workspace/node_modules node_modules
COPY --from=build --chown=node:node /workspace/apps/api/package.json apps/api/package.json
COPY --from=build --chown=node:node /workspace/apps/api/dist apps/api/dist
COPY --from=build --chown=node:node /workspace/packages/contracts/package.json packages/contracts/package.json
COPY --from=build --chown=node:node /workspace/packages/contracts/dist packages/contracts/dist
COPY --from=build --chown=node:node /workspace/packages/contracts/schemas packages/contracts/schemas
COPY --from=build --chown=node:node /workspace/packages/domain/package.json packages/domain/package.json
COPY --from=build --chown=node:node /workspace/packages/domain/dist packages/domain/dist
COPY --from=build --chown=node:node /workspace/packages/snapshot/package.json packages/snapshot/package.json
COPY --from=build --chown=node:node /workspace/packages/snapshot/dist packages/snapshot/dist
COPY --from=build --chown=node:node /workspace/data/generated data/generated
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
