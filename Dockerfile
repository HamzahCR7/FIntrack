FROM node:22-bookworm-slim AS build

WORKDIR /app

# Vite replaces this value in the browser bundle at build time.
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY backend/package.json backend/package-lock.json ./backend/

RUN npm ci --include=dev \
    && npm --prefix frontend ci --include=dev \
    && npm --prefix backend ci --include=dev

COPY . .

RUN node scripts/prepare-postgres.cjs \
    && cd backend \
    && npx prisma generate --schema prisma/schema.postgresql.prisma \
    && cd .. \
    && npm --prefix frontend run build \
    && npm --prefix backend run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/backend/scripts/run-ownership-migration.sh ./scripts/run-ownership-migration.sh
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/frontend/dist /app/frontend/dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
