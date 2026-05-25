# Evermedia Studio VPS Deployment Guide

This guide shows how to deploy Evermedia Studio on a Linux VPS using PostgreSQL, PM2, and Nginx.

It is written for users with limited deployment experience and is meant to be followed from top to bottom. If you follow the steps in order, you should end with:

- a working PostgreSQL database
- a configured `.env` file
- a running Evermedia Studio app under PM2
- Nginx forwarding traffic to the app
- a working `/api/health` endpoint
- a first admin account that can sign in

## What You Need Before You Start

Prepare these items first:

- A Linux VPS with SSH access
- A domain name that you can point to the VPS later
- A Supabase project
- A user account on the VPS that can use `sudo`
- Basic ability to edit files in the terminal with `nano`, `vim`, or another editor

This guide assumes a Debian or Ubuntu style server. The commands below use `apt`.

## Deployment Files Already In This Repo

This repository already includes these deployment-related files:

- PM2 config: `ecosystem.config.cjs`
- Nginx config template: `deploy/nginx/evermedia-studio.conf`
- Health check endpoint: `/api/health`
- Environment template: `.env.example`

## Step 1: Connect To The VPS

From your local machine:

```bash
ssh your-user@your-server-ip
```

If this is your first time logging in, the server may ask you to confirm its SSH fingerprint. Type `yes` and continue.

## Step 2: Install System Packages

Update package metadata first:

```bash
sudo apt update
```

Install the packages used in this guide:

```bash
sudo apt install -y nginx postgresql postgresql-contrib curl git
```

Now install Node.js 20 and npm. One common approach is NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Confirm the tools are available:

```bash
node -v
npm -v
psql --version
nginx -v
```

Expected result:

- `node -v` should show Node.js 20 or newer
- `npm -v` should print an npm version
- `psql --version` should print a PostgreSQL client version
- `nginx -v` should print an Nginx version

## Step 3: Clone The Repository

Choose a directory where you want to keep the app. A common location is your home directory:

```bash
cd ~
git clone <your-repo-url> Evermedia-UGC
cd Evermedia-UGC
```

If the repo is private, make sure the server can authenticate with GitHub or your Git provider before continuing.

## Step 4: Create The PostgreSQL Database And User

This application needs a PostgreSQL database before it can run migrations.

You need three things:

- a database name
- a database user
- a database password

In the examples below, we will use:

- database name: `evermedia_studio`
- database user: `evermedia_studio`
- database password: `change-this-password`

Open the PostgreSQL shell as the `postgres` superuser:

```bash
sudo -u postgres psql
```

Run these SQL commands:

```sql
CREATE USER evermedia_studio WITH PASSWORD 'change-this-password';
CREATE DATABASE evermedia_studio OWNER evermedia_studio;
GRANT ALL PRIVILEGES ON DATABASE evermedia_studio TO evermedia_studio;
\q
```

What these commands do:

- `CREATE USER` creates a PostgreSQL login
- `CREATE DATABASE` creates the actual database
- `OWNER evermedia_studio` makes that user the owner of the database
- `GRANT ALL PRIVILEGES` ensures the user can manage the database properly

If you already created the database and user earlier, you do not need to create them again.

Test the connection:

```bash
psql "postgresql://evermedia_studio:change-this-password@127.0.0.1:5432/evermedia_studio" -c '\dt'
```

If the connection works, PostgreSQL is ready.

## Step 5: Create The Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` in an editor:

```bash
nano .env
```

Fill in the values. A typical production `.env` will look like this:

```bash
KIE_API_KEY=your-kie-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_AUTH_REDIRECT_URL=https://your-domain.com
DATABASE_URL=postgresql://evermedia_studio:change-this-password@127.0.0.1:5432/evermedia_studio
MEDIA_STORAGE_DIR=/var/lib/evermedia-studio/media
SUPER_ADMIN_EMAILS=your-email@example.com
```

What each variable means:

- `KIE_API_KEY`
  - Required if you want generation features to work
- `SUPABASE_URL`
  - The URL of your Supabase project
- `SUPABASE_ANON_KEY`
  - The public client key used for auth flows
- `SUPABASE_SERVICE_ROLE_KEY`
  - The admin key used for account management features
- `SUPABASE_AUTH_REDIRECT_URL`
  - The public URL of your deployed app, for example `https://your-domain.com`
- `DATABASE_URL`
  - The PostgreSQL connection string for the database you created in Step 4
- `MEDIA_STORAGE_DIR`
  - The server directory where generated images and videos are stored
- `SUPER_ADMIN_EMAILS`
  - A comma-separated list of emails that are allowed to bootstrap the first local super admin account

### Important: First Login Bootstrap

Authentication accounts live in Supabase Auth, but app access is stored separately in the local PostgreSQL database.

That means:

- a valid Supabase account alone is not enough
- the first admin needs to be bootstrapped locally

The normal first-boot path is to put your email in `SUPER_ADMIN_EMAILS`, then sign in with that same Supabase account after deployment. The app will automatically create the local super admin access record on first login.

If you forget this, the sign-in may succeed in Supabase but the app can still reject the session with `account_not_provisioned`.

## Step 6: Create The Persistent Media Directory

Create the media directory:

```bash
sudo mkdir -p /var/lib/evermedia-studio/media
```

Set ownership so your app user can write to it. If your app will run as your current Linux user, use:

```bash
sudo chown -R $USER:$USER /var/lib/evermedia-studio
```

Confirm the directory exists:

```bash
ls -ld /var/lib/evermedia-studio /var/lib/evermedia-studio/media
```

This directory must be persistent. If you delete it or mount it on temporary storage, uploaded and generated media can disappear.

## Step 7: Install Node Dependencies

Inside the repo:

```bash
npm ci
```

This installs the exact dependency versions locked in `package-lock.json`.

If this step fails:

- check your Node.js version
- make sure `npm` is installed
- rerun `npm ci` after fixing the problem

## Step 8: Run Database Migrations

Run:

```bash
npm run db:migrate
```

This creates the tables the app needs in PostgreSQL.

Expected result:

- the command exits successfully
- no database connection errors appear

Common failure causes:

- `DATABASE_URL` is wrong
- the database does not exist
- the database user does not have enough permissions
- PostgreSQL is not running

## Step 9: Build The App

Run:

```bash
npm run build
```

The app should build successfully before you move to PM2.

If the build fails:

- do not continue to PM2 yet
- fix the build error first

## Step 10: Start The App With PM2

Install PM2 globally:

```bash
npm install --global pm2
```

Start the app:

```bash
pm2 start ecosystem.config.cjs
```

Check that the process is running:

```bash
pm2 status
```

You should see a process named `evermedia-studio`.

### If Port `3000` Is Already In Use

By default, the shipped PM2 config uses port `3000`.

If another app on the same VPS already uses `3000`, choose another internal port such as `3001` or `3100`, then update all three places to the same value:

- `ecosystem.config.cjs`
- the upstream server in `deploy/nginx/evermedia-studio.conf`
- the direct health-check command in this guide

Example:

- PM2 app port: `3001`
- Nginx upstream: `127.0.0.1:3001`
- direct health check: `curl http://127.0.0.1:3001/api/health`

Save the PM2 process list so it can be restored later:

```bash
pm2 save
```

Enable PM2 startup on boot:

```bash
pm2 startup
```

PM2 usually prints another command after `pm2 startup`. Copy and run that command exactly.

If the app keeps restarting:

```bash
pm2 logs evermedia-studio
```

That log output is usually the fastest way to see whether the problem is missing env vars, database issues, or file permission problems.

## Step 11: Configure Nginx

Nginx acts as the public web server in front of the Node.js app.

The app itself runs on the internal port configured in `ecosystem.config.cjs` (the checked-in PM2 config currently uses `3001`), but visitors should connect through Nginx on ports `80` and later `443` if you add TLS.

Open the shipped Nginx config:

```bash
nano deploy/nginx/evermedia-studio.conf
```

Change this line:

```nginx
server_name your-domain.com;
```

Replace `your-domain.com` with your real domain.

Keep the Nginx upstream port aligned with the `PORT` value in `ecosystem.config.cjs`.

Keep this upload setting in the server block so generation requests with staged image files are not rejected by Nginx before they reach Next.js:

```nginx
client_max_body_size 25m;
```

Copy the config into Nginx:

```bash
sudo cp deploy/nginx/evermedia-studio.conf /etc/nginx/sites-available/evermedia-studio
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/evermedia-studio /etc/nginx/sites-enabled/evermedia-studio
```

Test the Nginx configuration:

```bash
sudo nginx -t
```

If the test passes, reload Nginx:

```bash
sudo systemctl reload nginx
```

If Nginx was not already running, start it:

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Step 12: Point Your Domain To The VPS

Before testing the public site, point your domain to the VPS public IP address.

At your DNS provider, create or update an `A` record:

- host: `@`
- type: `A`
- value: `your-server-ip`

If you want a `www` hostname too, add a second record for `www` based on your DNS provider's interface.

DNS updates can take a few minutes to become visible, and sometimes longer.

## Step 13: Add HTTPS With Certbot

This step adds a TLS certificate so your site can load over `https://`.

There are two common paths:

- Nginx plugin
  - Best when your domain already points to the VPS and port `80` is reachable from the public internet
- Cloudflare DNS plugin
  - Best when you use Cloudflare DNS, want a wildcard certificate, or prefer DNS validation

### Option A: Use Certbot With The Nginx Plugin

Install Certbot using the snap-based path recommended by Certbot:

```bash
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
sudo snap set certbot trust-plugin-with-root=ok
sudo snap install --classic certbot-nginx
```

Request and install the certificate:

```bash
sudo certbot --nginx -d your-domain.com
```

If you also want `www`:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot will ask for:

- an email address for renewal notices
- agreement to the Let's Encrypt terms
- whether you want HTTP traffic redirected to HTTPS

For most production setups, choose redirect so Nginx sends all HTTP traffic to HTTPS automatically.

### Option B: Use Certbot With Cloudflare DNS

Use this path if:

- your DNS is hosted on Cloudflare
- you want a wildcard certificate such as `*.your-domain.com`
- or port `80` validation is inconvenient

Install Certbot and the Cloudflare DNS plugin:

```bash
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
sudo snap set certbot trust-plugin-with-root=ok
sudo snap install certbot-dns-cloudflare
```

Create a Cloudflare API token with DNS edit access for the zone you want to manage. In Cloudflare, a narrow token is better than using your full global API key.

Create a credentials file:

```bash
sudo mkdir -p /root/.secrets/certbot
sudo nano /root/.secrets/certbot/cloudflare.ini
```

Put your token in that file:

```ini
dns_cloudflare_api_token = your-cloudflare-api-token
```

Lock down the file permissions:

```bash
sudo chmod 600 /root/.secrets/certbot/cloudflare.ini
```

Request a certificate for the main domain:

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/certbot/cloudflare.ini \
  -d your-domain.com
```

Request a wildcard certificate:

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/certbot/cloudflare.ini \
  -d your-domain.com \
  -d *.your-domain.com
```

If DNS validation fails because records have not propagated yet, retry with a longer propagation wait:

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/certbot/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 60 \
  -d your-domain.com \
  -d *.your-domain.com
```

### If You Used The Cloudflare DNS Plugin

The DNS plugin gets the certificate, but it does not automatically edit the shipped Nginx config for you.

After the certificate is issued, edit your active Nginx site config and add the certificate paths:

```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

You should also keep an HTTP server block that redirects traffic to HTTPS:

```nginx
return 301 https://$host$request_uri;
```

After editing Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Test Automatic Renewal

Certbot installs automatic renewal support, but you should still test it:

```bash
sudo certbot renew --dry-run
```

Expected result:

- Certbot completes without renewal errors
- your certificate method works again without manual intervention

## Step 14: Verify The Deployment

Check the PM2 process:

```bash
pm2 status
```

Check the health endpoint directly against the Node.js app:

```bash
curl http://127.0.0.1:3000/api/health
```

If everything is configured correctly, you should get JSON like:

```json
{
  "checks": {
    "databaseUrlConfigured": true,
    "kieApiKeyConfigured": true,
    "mediaStorageConfigured": true,
    "mediaStorageWritable": true,
    "supabaseConfigured": true
  },
  "status": "ok"
}
```

Now test through Nginx:

```bash
curl http://your-domain.com/api/health
```

Then open the site in a browser:

- visit `https://your-domain.com`
- check that the app loads
- confirm the browser shows a valid TLS certificate
- try the login flow

## Step 15: First Login

To log in successfully on a fresh deployment:

1. Make sure the user already exists in Supabase Auth
2. Make sure that same email is listed in `SUPER_ADMIN_EMAILS`
3. Sign in through the deployed site

What should happen:

- Supabase authenticates the account
- the app sees the email in `SUPER_ADMIN_EMAILS`
- the app creates the local super admin access record
- the user is allowed into the app

After that, you can use the in-app account management flow to provision other users.

## Troubleshooting

### `DATABASE_URL` connection errors

Check:

- PostgreSQL is running
- the host, port, username, password, and database name are correct
- the database user can log in

Useful command:

```bash
psql "$DATABASE_URL" -c '\dt'
```

### Migration failures

Common reasons:

- the database does not exist
- the database user is not the owner and lacks privileges
- PostgreSQL is not reachable

### `MEDIA_STORAGE_DIR` missing or not writable

Symptoms:

- health endpoint returns `degraded`
- file operations fail

Fix:

```bash
sudo mkdir -p /var/lib/evermedia-studio/media
sudo chown -R $USER:$USER /var/lib/evermedia-studio
```

### Supabase auth configuration problems

If login pages show auth configuration warnings, verify:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Also make sure your Supabase project allows the correct callback URL:

```text
https://your-domain.com/auth/callback
```

### `account_not_provisioned`

This means:

- the user exists in Supabase Auth
- but the app could not find or create the local access record

For the first admin, check `SUPER_ADMIN_EMAILS` and make sure the login email matches exactly.

### PM2 restart loop

Read the logs:

```bash
pm2 logs evermedia-studio
```

Look for:

- missing environment variables
- database connection failures
- permission problems on the media directory

### Nginx config test fails

Run:

```bash
sudo nginx -t
```

Do not reload Nginx until that command succeeds.

Most common causes:

- typo in `server_name`
- duplicate site config
- broken symlink in `sites-enabled`

### Certbot fails during HTTP validation

Check:

- the domain already points to the VPS public IP
- port `80` is open
- Nginx is running
- the site is reachable over plain `http://`

If public HTTP validation is not convenient, use the Cloudflare DNS plugin path instead.

### Certbot fails during Cloudflare DNS validation

Check:

- the domain is actually using Cloudflare DNS
- the API token has permission to edit DNS for the correct zone
- the credentials file path is correct
- the credentials file is restricted with `chmod 600`

If DNS propagation is slow, retry with a higher `--dns-cloudflare-propagation-seconds` value.

### Health endpoint returns `degraded`

The health endpoint checks:

- `DATABASE_URL`
- `KIE_API_KEY`
- `MEDIA_STORAGE_DIR`
- write access to the media directory
- Supabase configuration

Use the JSON response to see which check failed, then fix that input and try again.
