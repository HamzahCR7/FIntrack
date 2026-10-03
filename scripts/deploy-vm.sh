#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/fintrack}"
REPO_URL="${REPO_URL:-https://github.com/<your-user>/<your-repo>.git}"
BRANCH="${BRANCH:-main}"
DOMAIN="${DOMAIN:-}"
PORT="${PORT:-3000}"
APP_ENV_FILE="${APP_ENV_FILE:-$APP_DIR/backend/.env}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required. Export it before running this script."
  exit 1
fi

if [[ -z "${ADMIN_USERNAME:-}" ]]; then
  echo "ADMIN_USERNAME is required. Export it before running this script."
  exit 1
fi

if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "ADMIN_PASSWORD is required. Export it before running this script."
  exit 1
fi

if [[ -z "${SESSION_SECRET:-}" ]]; then
  export SESSION_SECRET="$(openssl rand -hex 32)"
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Cloning repository into $APP_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

echo "Pulling latest changes"
git pull --ff-only origin "$BRANCH" || true

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2"
  sudo npm install -g pm2
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "Installing Nginx"
  sudo apt-get update
  sudo apt-get install -y nginx certbot python3-certbot-nginx
fi

cat > "$APP_ENV_FILE" <<EOF
NODE_ENV=production
PORT=$PORT
DATABASE_URL="$DATABASE_URL"
ADMIN_USERNAME="$ADMIN_USERNAME"
ADMIN_PASSWORD="$ADMIN_PASSWORD"
SESSION_SECRET="$SESSION_SECRET"
SESSION_DURATION_DAYS=30
CORS_ORIGINS=
EOF

cd "$APP_DIR/backend"

npm ci
npm run build

if [[ -d "$APP_DIR/frontend" ]]; then
  echo "Building frontend assets"
  npm --prefix "$APP_DIR/frontend" ci
  npm --prefix "$APP_DIR/frontend" run build
fi

cd "$APP_DIR/backend"

pm2 delete fintrack >/dev/null 2>&1 || true
pm2 start "npm start" --name fintrack --env-file "$APP_ENV_FILE"
pm2 save

if [[ -n "$DOMAIN" ]]; then
  sudo tee /etc/nginx/sites-available/fintrack >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

  sudo ln -sf /etc/nginx/sites-available/fintrack /etc/nginx/sites-enabled/fintrack
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl restart nginx

  echo "Requesting HTTPS certificate"
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@$DOMAIN || true
fi

echo "Deployment complete."
echo "Use: pm2 status"
echo "Health check: curl http://127.0.0.1:$PORT/health"
