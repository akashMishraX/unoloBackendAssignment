# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies required for Prisma
RUN apk add --no-cache openssl

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

# Copy sandbox files if they exist
COPY --from=builder /app/sandbox ./sandbox

EXPOSE 5000
CMD ["node", "src/main.js"]