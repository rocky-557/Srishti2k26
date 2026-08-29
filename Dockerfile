FROM node:22-alpine

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

EXPOSE 8526

CMD ["node", "server.js"]
