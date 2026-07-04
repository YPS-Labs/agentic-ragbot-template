# Multi-stage build for production optimization
FROM node:18-slim AS base

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files (including package-lock.json if it exists)
COPY package*.json ./

# Install Node.js dependencies (production only)
RUN npm install --omit=dev

# Copy Python requirements
COPY python_rag/requirements.txt ./python_rag/

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages -r python_rag/requirements.txt

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Create non-root user for security
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables
ENV NODE_ENV=production
ENV PYTHON_PATH=python3
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start server
CMD ["node", "server.js"]
