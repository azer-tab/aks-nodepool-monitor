# Multi-stage build for optimized image size
FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies (all for build phase)
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN npm run build

# Production stage
FROM node:18-alpine

# Install required tools: Azure CLI, kubectl
RUN apk add --no-cache \
    curl \
    bash \
    python3 \
    py3-pip \
    && pip3 install --no-cache-dir azure-cli \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/

WORKDIR /app

# Copy package.json for runtime reference
COPY package.json ./

# Copy built application from builder
COPY --from=builder /build/dist ./dist

# Install only production dependencies
RUN npm ci --only=production

# Set permissions for non-root execution (optional, for security)
# RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser
# USER appuser

# Default entrypoint
ENTRYPOINT ["node", "dist/index.js"]

# Default command - show help if no args provided
CMD ["--help"]
