# Evermedia Studio

Evermedia Studio is a Next.js application for authenticated UGC generation workflows with Supabase Auth, PostgreSQL-backed app data, and persistent media storage for generated outputs.

## Requirements

- Node.js `20.9.0` or newer
- PostgreSQL
- Supabase Auth
- A persistent writable directory for uploaded and generated media
- A `KIE_API_KEY` if you want generation features to work

## Deployment Assets

This repo already includes the core deployment artifacts for a Linux VPS setup:

- PM2 process definition: `ecosystem.config.cjs`
- Sample Nginx site config: `deploy/nginx/evermedia-studio.conf`
- Deployment health endpoint: `/api/health`

## Documentation

- Beginner-friendly Linux VPS deployment guide: [docs/deployment/vps-local-deployment.md](docs/deployment/vps-local-deployment.md)

## Quick Start

1. Copy `.env.example` to `.env`
2. Fill in your real environment values
3. Follow the full VPS deployment guide in `docs/deployment/vps-local-deployment.md`

## Notes

- This app should not be deployed as a purely serverless app while it still uses local file storage through `MEDIA_STORAGE_DIR`.
- Auth accounts live in Supabase Auth, while local PostgreSQL stores app-specific access records, generation runs, and media metadata.
