# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma

# Stage 2: Production Image
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app .
EXPOSE 4000
# Assumes schedulerService starts via src/index.js (or change to scheduler.js if needed)
CMD ["node", "src/index.js"]
