# ---------- Builder ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

# ---------- Runtime ----------
FROM node:20-bookworm-slim
WORKDIR /app

COPY --from=builder /app /app

ENV NODE_ENV=production
EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
