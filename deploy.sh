#!/bin/bash

# GabayLakbay Deployment Script for Cloudzy VPS
# Run this script on your Cloudzy VPS server

set -e  # Exit on any error

echo "🚀 Starting GabayLakbay deployment on Cloudzy VPS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Use a regular user with sudo privileges."
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
print_status "Installing Docker and Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed successfully"
else
    print_success "Docker is already installed"
fi

if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_success "Docker Compose is already installed"
fi

# Install additional tools
print_status "Installing additional tools..."
sudo apt install -y curl wget git htop ufw

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable

# Create application directory
APP_DIR="/opt/gabaylakbay"
print_status "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files (assuming you've uploaded them)
print_status "Setting up application files..."
if [ ! -f "$APP_DIR/docker-compose.prod.yml" ]; then
    print_error "Please upload your application files to $APP_DIR first!"
    print_status "You can use scp, rsync, or git clone to transfer files."
    print_status "Example: scp -r . user@your-server-ip:/opt/gabaylakbay/"
    exit 1
fi

cd $APP_DIR

# Create environment file
print_status "Creating environment configuration..."
if [ ! -f ".env" ]; then
    cp env.prod .env
    print_warning "Please edit .env file with your actual domain and settings!"
    print_status "Run: nano .env"
fi

# Update nginx configuration with your domain
print_status "Updating Nginx configuration..."
if [ -f "nginx-prod.conf" ]; then
    read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN
    if [ ! -z "$DOMAIN" ]; then
        sed -i "s/yourdomain.com/$DOMAIN/g" nginx-prod.conf
        print_success "Updated Nginx configuration with domain: $DOMAIN"
    fi
fi

# Create SSL directory
print_status "Creating SSL directory..."
mkdir -p ssl

# Generate self-signed certificate (replace with real SSL later)
print_status "Generating self-signed SSL certificate..."
if [ ! -f "ssl/cert.pem" ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    print_success "Self-signed SSL certificate generated"
    print_warning "Replace with a real SSL certificate from Let's Encrypt for production!"
fi

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.prod.yml down --remove-orphans
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Check service status
print_status "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Test the application
print_status "Testing application..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_success "Application is running successfully!"
    print_success "Frontend: http://$DOMAIN"
    print_success "Backend API: http://$DOMAIN/api/"
    print_success "Health check: http://$DOMAIN/health"
else
    print_warning "Application might not be fully ready yet. Check logs with:"
    print_status "docker-compose -f docker-compose.prod.yml logs"
fi

# Create systemd service for auto-start
print_status "Creating systemd service for auto-start..."
sudo tee /etc/systemd/system/gabaylakbay.service > /dev/null <<EOF
[Unit]
Description=GabayLakbay Translation Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable gabaylakbay.service
print_success "Systemd service created and enabled"

# Create update script
print_status "Creating update script..."
cat > update.sh << 'EOF'
#!/bin/bash
cd /opt/gabaylakbay
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
docker system prune -f
EOF
chmod +x update.sh

print_success "Deployment completed successfully! 🎉"
print_status "Next steps:"
print_status "1. Edit .env file with your actual settings"
print_status "2. Replace self-signed SSL with real certificate"
print_status "3. Configure your domain DNS to point to this server"
print_status "4. Test the application at http://$DOMAIN"
print_status ""
print_status "Useful commands:"
print_status "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
print_status "  Restart: docker-compose -f docker-compose.prod.yml restart"
print_status "  Update: ./update.sh"
print_status "  Stop: docker-compose -f docker-compose.prod.yml down"
