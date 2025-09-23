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

# Remove default nginx static assets
RUN rm -rf ./*
# Copy built assets
COPY --from=build /app/examples/web-repl/dist .
# Copy custom nginx config
COPY .github/config/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
