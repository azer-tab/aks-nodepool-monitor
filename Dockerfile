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
    py3-virtualenv \
    ca-certificates \
    \
    # Create an isolated Python virtual environment for Azure CLI
    && python3 -m venv /opt/az \
    \
    # Upgrade pip inside the virtual environment
    && /opt/az/bin/pip install --no-cache-dir --upgrade pip \
    \
    # Install Azure CLI inside the virtual environment
    && /opt/az/bin/pip install --no-cache-dir azure-cli \
    \
    # Make the az command available globally
    && ln -s /opt/az/bin/az /usr/local/bin/az \
    \
    # Download the latest stable kubectl binary for Linux AMD64
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    \
    # Mark kubectl as executable
    && chmod +x kubectl \
    \
    # Move kubectl into the system PATH
    && mv kubectl /usr/local/bin/

# Set the working directory for the production app
WORKDIR /app

# Copy package metadata for production dependency installation
COPY package*.json ./

# Copy the compiled application from the builder stage
COPY --from=builder /build/dist ./dist

# Install only production dependencies
RUN npm@5 --omit=dev

# Run the compiled Node.js application
ENTRYPOINT ["node", "dist/index.js"]

# Show help by default when no command arguments are provided
CMD ["--help"]