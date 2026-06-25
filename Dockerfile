# Multi-stage build for optimized image size
FROM node:18-alpine AS builder

# Set the working directory for the build stage
WORKDIR /build

# Copy dependency manifests first to improve Docker layer caching
COPY package*.json ./

# Install all dependencies needed to build the TypeScript project
RUN npm ci

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy application source code
COPY src ./src

# Compile TypeScript into JavaScript
RUN npm run build

# Start the smaller production runtime image
FROM node:18-alpine

# Install OS-level tools required by the app and CLI tools
# - curl: downloads kubectl and Kubernetes version metadata
# - bash: required by some CLI scripts
# - python3 / py3-pip / py3-virtualenv: required for Azure CLI
# - ca-certificates: enables HTTPS certificate validation
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
