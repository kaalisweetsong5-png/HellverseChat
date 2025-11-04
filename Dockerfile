# Multi-stage Docker build for HellverseChat
FROM node:18-alpine AS builder

# Build client
WORKDIR /app/client
COPY server/client/client/package*.json ./
RUN npm ci --only=production
COPY server/client/client/ ./
RUN npm run build

# Production server
FROM node:18-alpine AS production

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server/ ./

# Copy built client files
COPY --from=builder /app/client/dist ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S hellchat -u 1001
USER hellchat

EXPOSE 4000

CMD ["npm", "start"]