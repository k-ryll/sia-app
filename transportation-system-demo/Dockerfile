# Multi-stage build for React app
FROM node:20-alpine as build

# Set working directory
WORKDIR /app

# Copy package files
COPY transportation-system-demo/package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY transportation-system-demo/ .

# Copy locales to the expected location
COPY locales ./locales

# Build the app
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY transportation-system-demo/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
