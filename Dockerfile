# Multi-stage build for tokenscript-interpreter web-repl
# Build arguments allow injecting API/WS endpoints at build time
ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS build

# Build args for API/WS URLs (optional; can be provided via .env file)
ARG VITE_API_BASE_URL
ARG VITE_WS_URL

WORKDIR /app

# Copy the entire repository to maintain relative paths
COPY . .

# Install root dependencies first (leverage Docker layer caching)
RUN npm install --no-audit --no-fund

# Build the main interpreter library
RUN npm run build

# Install web-repl dependencies
WORKDIR /app/examples/web-repl
RUN npm install --no-audit --no-fund

# Build web-repl
RUN npm run build

# Runtime image (serve static assets via nginx)
FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html

# Set default port (can be overridden by Cloud Run)
ENV PORT=8080

# Remove default nginx static assets
RUN rm -rf ./*
# Copy built assets
COPY --from=build /app/examples/web-repl/dist .
# Copy custom nginx config template
COPY config/nginx/nginx.conf.template /etc/nginx/conf.d/default.conf.template

EXPOSE $PORT
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:$PORT/healthz || exit 1

# Substitute environment variables in nginx config and start nginx
CMD envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"