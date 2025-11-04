# HellverseChat Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy backend directory first
COPY backend/ ./backend/

# Install backend dependencies in correct directory
WORKDIR /app/backend
RUN npm install --production

# Go back to app root
WORKDIR /app

# Copy root package.json (for npm start command)
COPY package*.json ./

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