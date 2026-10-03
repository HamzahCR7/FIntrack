# Deploy FinTrack on an Oracle Cloud Always Free VM

This is the lowest-friction free setup that behaves closest to localhost, without Render’s sleep/cold-start problem.

## 1) Create the VM

In Oracle Cloud Console:

1. Create an Always Free VM
2. Ubuntu 22.04+ image
3. Open ports:
   - 22 (SSH)
   - 80 (HTTP)
   - 443 (HTTPS)
4. Keep SSH key-based login enabled

Connect:

```bash
ssh -i ~/.ssh/your_key.pem ubuntu@<VM_PUBLIC_IP>
```

---

## 2) Install runtime dependencies

```bash
sudo apt update
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node -v
npm -v
```

---

## 3) Clone the repo and install dependencies

```bash
cd ~
git clone https://github.com/<your-user>/<your-repo>.git
cd <your-repo>

npm ci
npm --prefix frontend ci
npm --prefix backend ci
```

---

## 4) Configure environment variables

Create a production env file for the backend:

```bash
cd ~/your-repo/backend
cat > .env <<'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://..."
ADMIN_USERNAME="your_admin_username"
ADMIN_PASSWORD="your_strong_admin_password"
SESSION_SECRET="generate_a_long_random_string"
SESSION_DURATION_DAYS=30
EOF
```

Notes:
- Use the same Neon Postgres connection string you were using in Render.
- Keep secrets out of Git.

---

## 5) Build the app

```bash
cd ~/your-repo/backend
npm run build
```

If you want to build the frontend assets too:

```bash
cd ~/your-repo/backend
npm run build:app
```

---

## 6) Start the backend with PM2

```bash
cd ~/your-repo/backend
pm2 start "npm start" --name fintrack
pm2 save
pm2 startup
```

Check health:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{ "status": "ok", "service": "FinTrack API", "phase": 5 }
```

---

## 7) Put Nginx in front of Node

Create a reverse proxy config:

```bash
sudo nano /etc/nginx/sites-available/fintrack
```

Paste:

```nginx
server {
    listen 80;
    server_name your-domain.com; 

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/fintrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8) Enable HTTPS with Let's Encrypt

If you have a domain:

```bash
sudo certbot --nginx -d your-domain.com
```

If you do not have a domain yet, use the VM IP directly with a temporary HTTP-only setup, or add a domain later.

---

## 9) Update the Android app API URL

In the frontend, set the deployed backend origin:

```bash
cd ~/your-repo/frontend
cp .env.native.example .env.native
```

Edit the file:

```env
VITE_API_URL=https://your-domain.com
```

Then rebuild the native app:

```bash
npm run native:sync
```

---

## 10) Common maintenance commands

```bash
pm2 status
pm2 logs fintrack --lines 100
pm2 restart fintrack
```

If you change environment variables:

```bash
pm2 restart fintrack
```

---

## 11) Why this is better than Render free

This VM approach keeps the app effectively always-on, which matches localhost behavior much more closely than a sleeping free service.

The app stays alive without the cold start penalty you were seeing on Render free.
