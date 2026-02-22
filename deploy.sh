#!/usr/bin/env bash
# =====================================================
# PGSaathi — Production Deployment Script
# =====================================================
# Run on a fresh Ubuntu VM (22.04/24.04):
#   chmod +x deploy.sh && sudo ./deploy.sh
#
# Prerequisites: A VM with a domain pointing to its IP
# =====================================================

set -euo pipefail

# ─── Configuration ────────────────────────────────────
echo ""
echo "============================================"
echo "  PGSaathi Production Deployment"
echo "============================================"
echo ""

read -rp "Enter your domain [pgsaathi.online]: " DOMAIN
DOMAIN=${DOMAIN:-pgsaathi.online}
read -rp "Enter your email (for SSL certificate notifications): " EMAIL

if [[ -z "$EMAIL" ]]; then
    echo "❌ Email is required for SSL certificate."
    exit 1
fi

echo ""
echo "→ Domain: $DOMAIN"
echo "→ Email:  $EMAIL"
echo ""

# ─── Step 1: Install Docker ──────────────────────────
echo "▸ Step 1: Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    echo "  ✓ Docker installed"
else
    echo "  ✓ Docker already installed"
fi

if ! command -v docker compose &>/dev/null && ! docker compose version &>/dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-compose-plugin
    echo "  ✓ Docker Compose plugin installed"
else
    echo "  ✓ Docker Compose already available"
fi

# ─── Step 2: Create production env files ─────────────
echo "▸ Step 2: Setting up environment files..."

# Backend .env.prod
if [ ! -f backend/.env.prod ]; then
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))" 2>/dev/null || openssl rand -base64 48)
    cat > backend/.env.prod <<EOF
# === MongoDB ===
MONGO_URL=mongodb://mongo:27017
DB_NAME=pgsaathi

# === Auth ===
SECRET_KEY=${SECRET_KEY}

# === Resend Email Service ===
RESEND_API_KEY=${RESEND_API_KEY:-your_resend_api_key_here}
SENDER_EMAIL=noreply@pgsaathi.online
EOF
    echo "  ✓ Created backend/.env.prod"
    echo "  ⚠ Edit backend/.env.prod to add your RESEND_API_KEY"
else
    echo "  ✓ backend/.env.prod already exists"
fi

# Export DOMAIN for docker-compose
export DOMAIN

# ─── Step 3: Generate Nginx config from template ─────
echo "▸ Step 3: Generating Nginx config..."
mkdir -p nginx
sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx/app.conf.template > nginx/app.conf
echo "  ✓ Generated nginx/app.conf for ${DOMAIN}"

# ─── Step 4: Get SSL Certificate ─────────────────────
echo "▸ Step 4: Obtaining SSL certificate..."

# First, start with a temporary HTTP-only nginx config for certbot challenge
cat > nginx/app.conf.temp <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'PGSaathi is setting up SSL...';
        add_header Content-Type text/plain;
    }
}
EOF

# Use temp config for initial certificate
cp nginx/app.conf nginx/app.conf.ssl
cp nginx/app.conf.temp nginx/app.conf

# Start nginx with HTTP-only config
docker compose -f docker-compose.prod.yml up -d nginx

# Wait for nginx to be ready
sleep 3

# Request certificate
docker compose -f docker-compose.prod.yml run --rm certbot \
    certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}"

# Restore full SSL config
cp nginx/app.conf.ssl nginx/app.conf
rm -f nginx/app.conf.temp nginx/app.conf.ssl

echo "  ✓ SSL certificate obtained for ${DOMAIN}"

# ─── Step 5: Build & Start everything ────────────────
echo "▸ Step 5: Building and starting all services..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "============================================"
echo "  ✅ Deployment Complete!"
echo "============================================"
echo ""
echo "  🌐 App:     https://${DOMAIN}"
echo "  🔧 API:     https://${DOMAIN}/api/"
echo ""
echo "  Services running:"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "  Useful commands:"
echo "    docker compose -f docker-compose.prod.yml logs -f        # View logs"
echo "    docker compose -f docker-compose.prod.yml restart        # Restart all"
echo "    docker compose -f docker-compose.prod.yml down           # Stop all"
echo "    docker compose -f docker-compose.prod.yml up -d --build  # Rebuild & start"
echo ""
echo "  To create a superadmin user:"
echo "    docker compose -f docker-compose.prod.yml exec backend python create_superadmin.py"
echo ""
echo "  SSL auto-renewal is running via certbot container."
echo ""
