FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S edgeagent -u 1001

# Change ownership
RUN chown -R edgeagent:nodejs /app
USER edgeagent

# Default command
CMD ["npm", "start"]
