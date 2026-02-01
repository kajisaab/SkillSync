# SkillSync NGINX API Gateway Dockerfile
# Base: Alpine Linux for minimal image size
# Purpose: API Gateway, load balancer, reverse proxy

FROM nginx:1.25-alpine

# Metadata
LABEL maintainer="SkillSync Team"
LABEL description="NGINX API Gateway for SkillSync microservices"
LABEL version="1.0"

# Install additional tools for debugging (optional)
RUN apk add --no-cache \
    curl \
    wget \
    vim

# Remove default NGINX configuration
RUN rm /etc/nginx/nginx.conf
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create log directory
RUN mkdir -p /var/log/nginx && \
    touch /var/log/nginx/access.log && \
    touch /var/log/nginx/error.log

# Set proper permissions
RUN chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /var/log/nginx

# Create a simple health check HTML
RUN echo "NGINX API Gateway - Healthy" > /usr/share/nginx/html/health.html

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start NGINX in foreground mode
CMD ["nginx", "-g", "daemon off;"]
