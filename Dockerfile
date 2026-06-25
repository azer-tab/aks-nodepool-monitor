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

# Set the target architecture for the build
ARG TARGETARCH

# Expose Docker Buildx target architecture to the Dockerfile
# Buildx sets this automatically when using platforms like linux/amd64 or linux/arm64
ARG TARGETARCH

# Install OS-level tools required by the app and CLI tools
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
    # Store the current target architecture from Docker Buildx
    # For linux/amd64 this becomes amd64
    # For linux/arm64 this becomes arm64
    && KUBECTL_ARCH="$TARGETARCH" \
    \
    # Download kubectl for the correct CPU architecture
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/${KUBECTL_ARCH}/kubectl" \
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
RUN npm ci --omit=dev

# Run the compiled Node.js application
ENTRYPOINT ["node", "dist/index.js"]

# Show help by default when no command arguments are provided
CMD ["--help"]