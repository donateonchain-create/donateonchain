FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application source
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3002

# Run migrations at container start (idempotent) then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
