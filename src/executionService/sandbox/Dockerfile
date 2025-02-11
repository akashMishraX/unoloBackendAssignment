FROM node:14-alpine
WORKDIR /app
COPY requirements.txt .
RUN npm install
COPY index.js .
CMD ["sh", "-c", "node index.js"]
