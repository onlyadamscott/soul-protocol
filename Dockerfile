# Soul Protocol Registry
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S soul && \
    adduser -S soul -u 1001

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p /app/data && chown -R soul:soul /app/data

USER soul

ENV PORT=3333
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

EXPOSE 3333

CMD ["node", "dist/server.js"]
