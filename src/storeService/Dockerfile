# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
# Generate the Prisma client (adjust schema path if needed)
RUN npx prisma generate --schema=prisma/schema.prisma

# Stage 2: Production Image
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
# Start the store service (assumes the entrypoint is src/server.js)
CMD ["node", "src/server.js"]
