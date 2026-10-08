# Multi-stage Dockerfile for CuraMed POS (Full-Stack)
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias del cliente y compilar
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Stage de Producción
FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist

WORKDIR /app/server

# Generar Prisma Client
RUN npx prisma generate

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/server.js"]
