# Deployment Guide

## Quick Deploy Options

### 1. Railway (Recommended for MVP)

Railway is the easiest option - it auto-detects Docker Compose.

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

**Add environment variables in Railway dashboard:**
- `DATABASE_URL` (Railway provides PostgreSQL)
- `REDIS_URL` (Railway provides Redis)
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `HF_TOKEN`
- `JWT_SECRET` (generate with `openssl rand -hex 32`)

**Estimated cost**: $5-20/month

---

### 2. Render

1. Go to [render.com](https://render.com)
2. Connect your GitHub repo
3. Create services:

**Web (Next.js Frontend)**
- Type: Web Service
- Root Directory: `apps/web`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: `NEXT_PUBLIC_API_BASE_URL=https://your-api.onrender.com`

**API (FastAPI Backend)**
- Type: Web Service
- Root Directory: `apps/api`
- Dockerfile Path: `Dockerfile`
- Environment variables from `.env`

**Worker (Celery)**
- Type: Background Worker
- Root Directory: `apps/worker`
- Dockerfile Path: `Dockerfile`

**PostgreSQL**
- Type: PostgreSQL
- Copy connection string to `DATABASE_URL`

**Redis**
- Type: Redis
- Copy connection string to `REDIS_URL`

**Estimated cost**: $25-50/month

---

### 3. DigitalOcean App Platform

Create `.do/app.yaml`:

```yaml
name: palmcare-ai
region: nyc
services:
  - name: web
    github:
      repo: your-username/palmcare-ai-mvp
      branch: main
      deploy_on_push: true
    source_dir: /apps/web
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    build_command: npm install && npm run build
    run_command: npm start
    envs:
      - key: NEXT_PUBLIC_API_BASE_URL
        value: ${api.PUBLIC_URL}

  - name: api
    github:
      repo: your-username/palmcare-ai-mvp
      branch: main
    source_dir: /apps/api
    dockerfile_path: Dockerfile
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}

  - name: worker
    github:
      repo: your-username/palmcare-ai-mvp
      branch: main
    source_dir: /apps/worker
    dockerfile_path: Dockerfile
    instance_count: 1
    instance_size_slug: basic-xxs

databases:
  - name: db
    engine: PG
    production: false
    cluster_name: palmcare-db
```

**Estimated cost**: $30-60/month

---

### 4. Fly.io (Docker-native)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch each service
cd apps/api && fly launch --name palmcare-api
cd apps/web && fly launch --name palmcare-web
cd apps/worker && fly launch --name palmcare-worker

# Create PostgreSQL
fly postgres create --name palmcare-db

# Create Redis
fly redis create --name palmcare-redis
```

**Estimated cost**: $10-40/month

---

## Production Checklist

### Security
- [ ] Generate strong `JWT_SECRET`: `openssl rand -hex 32`
- [ ] Use HTTPS everywhere
- [ ] Set `DEBUG=false` in production
- [ ] Rotate API keys if exposed
- [ ] Enable database SSL

### Environment Variables (Required)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secure-random-string
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
HF_TOKEN=hf_...
S3_ENDPOINT_URL=https://your-s3-endpoint
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=palmcare-audio
```

### Performance
- [ ] Enable Redis caching
- [ ] Set up CDN for static assets
- [ ] Configure database connection pooling
- [ ] Set appropriate worker concurrency

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Enable application logging
- [ ] Set up uptime monitoring
- [ ] Configure alerts

---

## File Storage Options

Your app uses S3-compatible storage for audio files.

**Option A: AWS S3**
```
S3_ENDPOINT_URL=https://s3.amazonaws.com
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key
S3_BUCKET=your-bucket-name
```

**Option B: DigitalOcean Spaces**
```
S3_ENDPOINT_URL=https://nyc3.digitaloceanspaces.com
S3_ACCESS_KEY=your-spaces-key
S3_SECRET_KEY=your-spaces-secret
S3_BUCKET=your-space-name
```

**Option C: Cloudflare R2** (cheapest)
```
S3_ENDPOINT_URL=https://your-account.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-r2-access-key
S3_SECRET_KEY=your-r2-secret-key
S3_BUCKET=your-bucket
```

---

## Domain & SSL

Most platforms provide free SSL. To use a custom domain:

1. Add domain in platform dashboard
2. Point DNS to provided address:
   - A record: `@` → Platform IP
   - CNAME: `www` → Platform domain
3. Wait for SSL certificate (usually automatic)

---

## Scaling

When you need more capacity:

**Horizontal scaling:**
- Add more API instances
- Add more worker instances

**Vertical scaling:**
- Upgrade instance sizes
- Upgrade database plan

**Database optimization:**
- Add read replicas
- Enable connection pooling (PgBouncer)
