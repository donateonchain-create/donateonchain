# Render Docker Image Deploy (services/api)

## Preconditions
- Prisma migrations are committed under `services/api/prisma/migrations`.
- Render Postgres is provisioned.

## Build and push image (example: GHCR)
1. Create a GitHub PAT with `write:packages`.
2. Login:

```bash
docker login ghcr.io
```

3. Build:

```bash
docker build -t ghcr.io/<org-or-user>/donateonchain-api:latest services/api
```

4. Push:

```bash
docker push ghcr.io/<org-or-user>/donateonchain-api:latest
```

## Render configuration
Create a **Web Service** -> **Existing Image**.

- Image URL: `ghcr.io/<org-or-user>/donateonchain-api:latest`
- Environment variables:
  - `DATABASE_URL` (use Render **Internal Database URL**)
  - `CORS_ORIGIN`
  - `MIRROR_NODE_URL`
  - `MIRROR_CONTRACTS`
  - Optional: `MIRROR_POLL_INTERVAL_MS`, `MIRROR_START_TIMESTAMP`

## Startup behavior
The container entrypoint runs:
- `prisma migrate deploy`
- `node src/index.js`

So migrations are applied automatically on every deploy.
