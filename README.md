# Evermedia UGC Studio

Deployment guide for running this app in production.

## What this app needs

This project is a Next.js app that depends on:

- Node.js `20.9.0` or newer
- A PostgreSQL database
- Supabase Auth
- A persistent writable directory for uploaded and generated media
- A `KIE_API_KEY` if you want AI generation to work

## Recommended hosting

Use a host that can run a long-lived Node.js server and mount persistent storage, for example:

- A VPS or VM
- Docker on a server with a mounted volume
- A platform that supports persistent disks or volumes

Do not deploy this as a purely serverless app unless you first replace local file storage with object storage. The app writes media files to `MEDIA_STORAGE_DIR`, so platforms with ephemeral filesystems can lose uploaded assets.

## Environment variables

Create a `.env` file from `.env.example` and fill in these values:

```bash
KIE_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_AUTH_REDIRECT_URL=
DATABASE_URL=
MEDIA_STORAGE_DIR=
```

Notes:

- `KIE_API_KEY`: required for generation features
- `SUPABASE_URL`: required for authentication
- `SUPABASE_ANON_KEY`: required for authentication
- `SUPABASE_SERVICE_ROLE_KEY`: optional in the current codebase
- `SUPABASE_AUTH_REDIRECT_URL`: recommended in production, usually your public site URL such as `https://your-domain.com`
- `DATABASE_URL`: PostgreSQL connection string
- `MEDIA_STORAGE_DIR`: absolute path to a writable persistent folder, for example `/var/lib/evermedia-ugc/media`

## Production setup

### 1. Install dependencies

```bash
npm ci
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env` with your production values.

### 3. Create the media directory

Make sure the directory from `MEDIA_STORAGE_DIR` exists and is writable by the app process:

```bash
mkdir -p /var/lib/evermedia-ugc/media
```

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. Build the app

```bash
npm run build
```

### 6. Start the app

```bash
NODE_ENV=production npm run start
```

By default, Next.js serves the app on port `3000`.

## Supabase callback setup

Authentication callbacks in production should point to:

```text
https://your-domain.com/auth/callback
```

Recommended production value:

```bash
SUPABASE_AUTH_REDIRECT_URL=https://your-domain.com
```

Make sure your Supabase Auth settings allow the same site URL and callback URL.

## Suggested deployment flow on a Linux server

```bash
git clone <your-repo-url>
cd Evermedia-UGC
npm ci
cp .env.example .env
npm run db:migrate
npm run build
NODE_ENV=production npm run start
```

For a real production setup, run the app behind Nginx or Caddy and use a process manager such as `pm2` or `systemd`.

## Quick validation before going live

Run these checks before deployment:

```bash
npm run lint
npm test
npm run build
```

## Troubleshooting

- Login page shows auth configuration warning: `SUPABASE_URL` or `SUPABASE_ANON_KEY` is missing
- Generation requests fail immediately: `KIE_API_KEY` is missing
- Server crashes on file operations: `MEDIA_STORAGE_DIR` is missing or not writable
- Uploaded assets disappear after restart or redeploy: your host is using ephemeral storage instead of a persistent volume