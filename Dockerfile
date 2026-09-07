# HilmanAI — Next.js production imajı (Render / herhangi bir Docker host)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# .env dosyası imaja GÖMÜLMEZ — secret'lar ortamdan (Render Dashboard) verilir
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S hilman && adduser -S hilman -G hilman
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# JSON storage için yazılabilir veri dizini (Render diski buraya bağlanır)
RUN mkdir -p /var/hilman-data && chown hilman:hilman /var/hilman-data
VOLUME /var/hilman-data
USER hilman
EXPOSE 3000
ENV PORT=3000
ENV DATA_DIR=/var/hilman-data
CMD ["npx", "next", "start", "-p", "3000"]
