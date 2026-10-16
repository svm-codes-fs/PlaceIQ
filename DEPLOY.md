# Deploying PlaceIQ

PlaceIQ runs as six containers: PostgreSQL (with pgvector), Redis, the Flask
API (gunicorn), a Celery worker, Celery Beat (scheduled jobs) and nginx (the
built React app plus a reverse proxy for `/api`, including WebSockets).
`docker-compose.prod.yml` defines all of them. CI builds and runs exactly this
stack on every push and smoke-tests it through nginx (`.github/workflows/ci.yml`,
job `docker`).

## Option A: one virtual machine (recommended)

Any Linux VM with 2 GB RAM and Docker works (a $5–6/month droplet, Lightsail
instance or the Oracle Cloud free tier).

1. Install Docker and clone the repository.
2. Create `.env` next to `docker-compose.prod.yml`:

   ```
   SECRET_KEY=<64 random hex characters>
   JWT_SECRET_KEY=<64 different random hex characters>
   POSTGRES_USER=placeiq
   POSTGRES_PASSWORD=<strong password>
   POSTGRES_DB=placeiq
   CORS_ORIGINS=https://placeiq.example.com
   FRONTEND_URL=https://placeiq.example.com
   # Optional: demo colleges and accounts (all use SEED_PASSWORD)
   SEED_DEMO=true
   SEED_PASSWORD=<demo password>
   # Optional: Claude for resume parsing and interview scoring
   ANTHROPIC_API_KEY=<key>
   # Optional: real email
   EMAIL_BACKEND=smtp
   MAIL_HOST=smtp.example.com
   MAIL_USERNAME=...
   MAIL_PASSWORD=...
   MAIL_FROM=PlaceIQ <no-reply@example.com>
   ```

   Generate secrets with `python -c "import secrets; print(secrets.token_hex(32))"`.

3. Start it:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   The API container applies migrations on every start, so upgrades are
   `git pull` followed by the same command.

4. Put HTTPS in front of port 80. The simplest is Caddy on the host
   (`placeiq.example.com { reverse_proxy localhost:80 }`) or a Cloudflare proxy.
   Session cookies are marked `Secure` in production, so sign-in only works
   over HTTPS. To try the stack over plain HTTP first, set
   `JWT_COOKIE_SECURE=false` (never leave it like that in production).

5. Check it: `curl https://placeiq.example.com/api/health` returns `{"status":"ok"}`.

Backups: `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U placeiq placeiq > backup.sql`.
Uploaded resumes live in the `uploads` volume.

## Option B: managed services

The same images run on container platforms (Render, Railway, Fly.io, ECS):

| Piece | Managed option | Notes |
|---|---|---|
| PostgreSQL | Neon, Supabase, Render Postgres | Needs the `vector` extension (all three support it) |
| Redis | Upstash, Render Key Value | Used by Celery and the Socket.IO message queue |
| API | Container service from `Dockerfile` | `FLASK_CONFIG=production`; run `flask --app run:app db upgrade` as a release/pre-deploy command |
| Worker | Same image, command `celery -A app.tasks.worker worker` | Must share upload storage with the API (or run in the same container) |
| Beat | Same image, command `celery -A app.tasks.worker beat` | Exactly one instance |
| Frontend | Static hosting of `frontend/dist` | `/api/*` must reach the API on the **same origin** (cookies are same-site); use the host's rewrite/proxy rules, e.g. a Vercel rewrite from `/api/:path*` to the API URL |

Environment variables are listed in `.env.example`. Keep one API process (scale
with threads) unless you add sticky sessions, because Socket.IO connections are
tied to the process that accepted them.
