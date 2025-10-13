# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
WORKDIR /app

# Copy policy package (used via relative import)
COPY packages/policy /app/packages/policy
WORKDIR /app/packages/policy
RUN npm install --no-audit --no-fund && npm run build

# Copy mission-dispatcher app
COPY apps/mission-dispatcher /app/apps/mission-dispatcher
WORKDIR /app/apps/mission-dispatcher
RUN npm install --no-audit --no-fund && npm run build

CMD ["node", "dist/index.js"]
