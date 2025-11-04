# HellverseChat Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy root package.json first
COPY package*.json ./

# Install root dependencies
RUN npm install --production

# Copy backend directory
COPY backend/ ./backend/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hellchat -u 1001 -G nodejs

# Change ownership and switch user
RUN chown -R hellchat:nodejs /app
USER hellchat

# Expose port (Railway automatically sets PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "import('http').then(http => http.get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1)))"

# Start the application
CMD ["npm", "start"]