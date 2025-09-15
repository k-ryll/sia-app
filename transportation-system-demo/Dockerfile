# Stage 1: Build React app
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# -------------------
# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built app
COPY --from=build /app/dist /usr/share/nginx/html

# Use nginx template instead of fixed conf
COPY nginx.conf /etc/nginx/templates/default.conf.template


# Default backend host (can be overridden at runtime)
ENV BACKEND_HOST=gabaylakbay-backend:latest

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
