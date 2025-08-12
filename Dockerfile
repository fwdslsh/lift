# Multi-stage Dockerfile for Catalog CLI
# Uses Ubuntu for glibc compatibility with Bun executables

# Build stage
FROM node:latest AS builder

# Install essential dependencies for building
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun runtime
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun

# Set working directory
WORKDIR /build

# Copy source files and package configuration
COPY src/ ./src/
COPY package.json ./
COPY tests/ ./tests/

# Install dependencies using Bun
RUN bun install --frozen-lockfile

# Run tests to ensure build quality
RUN bun test

# Build the binary using Bun
RUN bun build src/cli.js --compile --outfile /usr/local/bin/catalog && \
    chmod +x /usr/local/bin/catalog

# Verify the binary works
RUN /usr/local/bin/catalog --version

# Runtime stage
FROM ubuntu:latest

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m -s /bin/bash appuser

# Copy the binary from builder stage
COPY --from=builder /usr/local/bin/catalog /usr/local/bin/catalog

# Create working directory and set permissions
WORKDIR /workspace
RUN chown appuser:appgroup /workspace

# Switch to non-root user
USER appuser

# Add metadata labels
LABEL org.opencontainers.image.title="Catalog CLI" \
      org.opencontainers.image.description="Lightweight CLI that scans Markdown directories to generate llms.txt and index.json files" \
      org.opencontainers.image.url="https://github.com/fwdslsh/catalog" \
      org.opencontainers.image.source="https://github.com/fwdslsh/catalog" \
      org.opencontainers.image.vendor="fwdslsh" \
      org.opencontainers.image.licenses="CC-BY-4.0"

# Set default entrypoint and command
ENTRYPOINT ["catalog"]
CMD ["--help"]
