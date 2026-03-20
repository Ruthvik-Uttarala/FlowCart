# FlowCart

FlowCart is a judge-ready Next.js App Router launch console with live integrations for Airia, Shopify, Instagram Graph API, and Supabase Auth.

It is built to show a real product flow end to end:

1. authenticate with Supabase
2. save live connection settings
3. create or edit a product bucket
4. upload a product image
5. enhance title and description through Airia
6. create a Shopify product with live client-credentials auth
7. publish an Instagram post through Graph API
8. mark the bucket `DONE` only after the Shopify and Instagram steps succeed

## Setup Instructions

1. Install dependencies.
2. Copy `.env.example` to `.env.local`.
3. Fill in every required environment variable.
4. Start the app with `npm run dev`.
5. Open `http://localhost:3000/auth`, sign in or sign up, then continue to `/settings` and `/dashboard`.

For a production-style local check:

```bash
npm run build
npm run start -- -H 127.0.0.1 -p 3100
```

Optional validation helpers:

```bash
npm run airia:check
npm run smoke:live
npm run verify:phase
```

## Demo Script

Use this script for a judge-facing walkthrough:

1. Open the home page and introduce FlowCart as a live product launch console.
2. Open `/auth` and show the Supabase sign-in or sign-up flow.
3. Open `/settings` and point out the live readiness indicators.
4. Save Shopify, Instagram, and Airia settings.
5. Open `/dashboard`.
6. Create a bucket or select an existing one.
7. Upload a product image.
8. Enter a raw title, description, quantity, and price.
9. Run the title and description enhancement actions.
10. Click `Go`.
11. Show the final state and confirm whether the bucket reached `DONE` or surfaced a clear `FAILED` reason.
12. If needed, run `Go(All)` to show sequential processing across multiple buckets.

## Judge-Facing Architecture

FlowCart keeps the product narrative simple and honest:

- **Frontend**: Next.js App Router pages at `/auth`, `/settings`, and `/dashboard`
- **Request guard**: `proxy.ts` protects authenticated routes with Supabase session checks
- **API layer**: route handlers under `app/api/**` cover auth, settings, buckets, Airia enhancement, health, readiness, and batch launch flows
- **Upload serving**: route handler at `app/uploads/[file]/route.ts` serves uploaded assets from storage
- **Persistence**: file-based state in `data/*` plus upload files served through `/uploads/*`
- **AI integration**: Airia live API for title and description generation
- **Commerce integration**: Shopify Admin API using client-credentials auth at runtime
- **Social integration**: Instagram Graph API for `media` and `media_publish`
- **Status model**: `EMPTY`, `READY`, `ENHANCING`, `PROCESSING`, `DONE`, and `FAILED`

What judges should notice:

- there is no fake success path for the integrations
- the bucket only becomes `DONE` after the live publish steps complete
- failed external calls surface explicit error text instead of silent fallback behavior

## Environment Variables

### Required for the app

| Variable | Purpose |
| --- | --- |
| `AIRIA_API_URL` | Live Airia execution URL |
| `AIRIA_API_KEY` | Airia API secret |
| `AIRIA_AGENT_ID` / `AIRIA_AGENT_GUID` | Agent identifier accepted by the live Airia config |
| `SHOPIFY_STORE_DOMAIN` | Shopify store domain or subdomain |
| `SHOPIFY_CLIENT_ID` | Shopify app client ID |
| `SHOPIFY_CLIENT_SECRET` | Shopify app client secret |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram Graph API token |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Instagram business account ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL exposed to the browser bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key exposed to the browser bundle |

### Optional runtime variables

| Variable | Purpose |
| --- | --- |
| `INSTAGRAM_ENABLED` | Set to `false` to disable Instagram publishing |
| `MERCHFLOW_STORAGE_DIR` | Override the file storage root used for local persistence |
| `AIRIA_API_METHOD` | Custom Airia request method |
| `AIRIA_API_BODY_SHAPE` | Airia request body shape (`compat`, `payload`, `wrapped`, or `flat`) |
| `AIRIA_API_TIMEOUT_MS` | Airia request timeout in milliseconds |
| `AIRIA_API_AUTH_HEADER_NAME` | Auth header name for Airia requests |
| `AIRIA_API_AUTH_HEADER_PREFIX` | Prefix used before the Airia API key |
| `AIRIA_API_KEY_HEADER_NAME` | Secondary API key header name for Airia requests |
| `AIRIA_API_HEADERS_JSON` | JSON object of extra Airia headers |
| `AIRIA_EXTRA_HEADERS_JSON` | Alternate JSON object of extra Airia headers |

### Local helper variables

| Variable | Purpose |
| --- | --- |
| `BASE_URL` | Base URL used by the local verification scripts |
| `SCRIPT_TIMEOUT_MS` | Timeout used by the local smoke script |

Notes:

- `NEXT_PUBLIC_*` values are bundled into the client at build time, so change them and rebuild before redeploying.
- If `AIRIA_AGENT_ID` and `AIRIA_AGENT_GUID` are both set, the app accepts either one.
- If `MERCHFLOW_STORAGE_DIR` is not set, Vercel deployments fall back to a temp storage root under `/tmp`, so uploads and file-backed state remain writable but ephemeral.

## Exact Vercel Deploy Steps

1. Push the repo to GitHub.
2. In Vercel, choose `Add New -> Project`.
3. Import the GitHub repository.
4. Leave the framework preset as `Next.js`.
5. Keep the install command as `npm install`.
6. Keep the build command as `npm run build`.
7. Leave the output directory unset so Vercel uses the Next.js default.
8. Add every required environment variable in Vercel Project Settings for Production, Preview, and Development.
9. Set the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values before the first deployment, then redeploy whenever those values change.
10. Deploy the project.
11. After deployment, open `/api/health`, `/api/readiness`, `/auth`, `/settings`, and `/dashboard` on the Vercel URL to confirm the app is live.
12. Remember that uploads are served from `/uploads/<file>` and Vercel storage is ephemeral unless `MERCHFLOW_STORAGE_DIR` points at persistent storage.

Do not switch the project to static export. FlowCart depends on server-side route handlers and live integration calls.

## Live Integration Notes

### Airia

- FlowCart expects a live Airia execution endpoint, API key, and agent identifier.
- The optional Airia request tuning env vars are already wired in the codebase and safe to leave at their defaults.

### Shopify

- The app uses the live Shopify client-credentials flow at runtime.
- `SHOPIFY_STORE_DOMAIN` should point at the real store domain used for product creation.

### Instagram

- Publishing goes through the live Instagram Graph API.
- If Instagram is disabled with `INSTAGRAM_ENABLED=false`, the publish step is skipped, but the app should still make that state visible.

### Supabase Auth

- Supabase provides the live authentication layer for `/auth` and route protection.
- The public Supabase env vars must be present both locally and in Vercel.

## Honest Limitations

- Persistence is file-based today, so it is not durable on serverless infrastructure.
- Uploads live on the local filesystem and are served through `/uploads`, which is fine for a demo but not production-grade storage.
- The app depends on live credentials for Airia, Shopify, Instagram, and Supabase. There is no mock fallback for the main flow.
- Public Supabase env vars are build-time values, so changing them requires a rebuild and redeploy.
- Vercel is a good deployment target for the UI and route handlers, but the current storage model is still a hackathon-era compromise because the default storage root is ephemeral there.
