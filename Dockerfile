# Use Node.js 22 Alpine base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install git for admin git-pull updates
RUN apk add --no-cache git

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=7102

# Install dependencies first for optimal Docker layer caching
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy application source code
COPY . .

# Set proper file permissions for the non-root node user
RUN chown -R node:node /app

# Use non-root user for security best practices
USER node

# Expose application port
EXPOSE 7102

# Launch application server
CMD ["node", "server.js"]
