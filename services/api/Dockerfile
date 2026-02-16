# ---------- Builder ----------
FROM node:20-bookworm-slim AS builder
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

COPY package.json package-lock.json ./

WORKDIR /app/services/api
COPY services/api/package.json services/api/package-lock.json ./
RUN npm ci --omit=dev

COPY services/api/prisma ./prisma
RUN npx prisma generate

COPY services/api/src ./src

# ---------- Runtime ----------
FROM node:20-bookworm-slim
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app/services/api

COPY --from=builder /app/services/api /app/services/api

ENV NODE_ENV=production
EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
