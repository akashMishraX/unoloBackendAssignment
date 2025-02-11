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
EXPOSE 5000
# Adjust the entrypoint as necessary. Here we assume src/main.js is the primary file.
CMD ["node", "src/main.js"]
