# Use the official Node.js image as base
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json before running npm install
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Ensure Prisma schema is properly set up
RUN npx prisma generate

# Expose the application port
EXPOSE 3000

# Start the application
RUN npm run start
