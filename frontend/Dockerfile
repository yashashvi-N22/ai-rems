# ==============================================================================
# AI-REMS Frontend Multi-Stage Dockerfile
# Stage 1: Build Vite + React TypeScript Application
# Stage 2: Serve with Nginx Alpine Reverse Proxy
# ==============================================================================

# Stage 1: Build
FROM node:20-alpine as build-stage

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
