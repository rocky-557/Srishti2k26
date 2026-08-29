# Use Node.js 22 Alpine base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=4173

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
EXPOSE 4173


# Launch application server
CMD ["node", "server.js"]
