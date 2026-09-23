# ReviewFlow

ReviewFlow is an incremental rebuild of an existing competitive reputation intelligence application. The existing Supabase data is retained. The change-focused dashboard, read-only history, metric insights, alerts, competitor management, opt-in weekly digest endpoint, and fictional review-analysis demo are implemented. A manual capture pilot is available in Settings. Google Business Profile OAuth and daily own-business capture are implemented but require an approved Google Cloud project and OAuth credentials before activation.

## Local setup

Requirements: Node.js 22 or later, npm, access to the ReviewFlow Supabase project, a Google Places API key for business search, and a Resend account for email-link login.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in the credentials. Never commit `.env.local`.
3. Run `npm run dev` and open `http://localhost:3000/login`. `/demo` uses fictional data and requires no API key or database write.

For a fully local session with no Resend account, start Docker Desktop, run `npx supabase start`, then `npm run dev:local`. This command reads the local Supabase service key into the process without changing `.env.local`. In `/login`, enter any local test email and use the displayed one-time link. The link is only returned in development when both the app and database are on localhost. A manual business name and Place ID can be entered in Settings; Google business search still requires a Places key.

The app normally uses the restored remote Supabase database. `supabase/migrations` includes a reconstructed baseline for the ten existing tables and later changes. A fresh local database was created and reset successfully with `npx supabase start` and `npx supabase db reset` on this machine. See [docs/current-state.md](docs/current-state.md).

## Checks

- `npx tsc --noEmit --incremental false` — TypeScript check without writing build output.
- `npm test` — metric and review-analysis tests.
- `npm run build` — production compilation.
- `npm run lint` — ESLint.

## Security boundary

The browser does not connect to Supabase directly. Server routes use the service-role key. Direct `anon` and `authenticated` table access was revoked and RLS enabled in September 2026. Application routes now resolve the logged-in profile and check ownership. Never use the service-role key in browser code or a `NEXT_PUBLIC_` variable.

## Data source and weekly email

The demo uses invented reviews. Historical review-text ingestion needs an authorized source and retention rules. Existing Google Places integration is for business discovery; a Google API key alone does not provide complete competitor reviews or establish historical storage rights. Legacy snapshot POST routes are disabled by default with `LEGACY_GOOGLE_CAPTURE_ENABLED=false`.

For authorized own-business captures, create a Google Cloud OAuth web client after Google approves the project for Business Profile APIs. Enable My Business Account Management, My Business Business Information, and Google My Business APIs. Set `GOOGLE_BUSINESS_CLIENT_ID`, `GOOGLE_BUSINESS_CLIENT_SECRET`, and a random 32-byte hex `GOOGLE_TOKEN_ENCRYPTION_KEY` on the server. Register `https://project-qdebw.vercel.app/api/google-business/callback` as an authorized redirect URI (and the localhost equivalent for local testing). Keep the encryption key stable; changing it invalidates stored refresh tokens. The owner saves the correct Place ID in Settings and authorizes ReviewFlow with their Google account. The callback only connects a managed location with the same Place ID. Refresh tokens are encrypted at rest; the daily job stores only aggregate rating and review count, not review text. Google requires a verified active Business Profile and project approval; see [prerequisites](https://developers.google.com/my-business/content/prereqs) and [basic setup](https://developers.google.com/my-business/content/basic-setup).

For a pilot, the signed-in owner can enter today's checked rating and review count for their business and linked competitors in Settings. Captures are marked `manual_owner` and limited to one per subject per UTC day. The first capture is a baseline, not a growth claim. The schema keeps legacy captures with `legacy_google_places` provenance. No review text is inferred from aggregate numbers.

## Vercel deployment

`vercel.json` schedules a Google Business Profile capture at 07:00 UTC and an email check at 08:00 UTC in production. The capture job is a no-op until OAuth credentials and the encryption key are configured. The email job sends each opted-in profile at most once per seven days and only when an own-business capture occurred in that period. The `reviewflow` Vercel project is connected to `Walrus92/reviewflow` and published at `https://project-qdebw.vercel.app`. The migration branch is deployed manually to Production. Automatic Preview builds from this branch currently fail because Preview lacks the production-only Supabase variables; configure an isolated Preview environment before using it for testing.

Production variables are configured in Vercel, except `RESEND_FROM_EMAIL`, which needs a verified sender domain. `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` currently use the project's assigned HTTPS domain. `GOOGLE_PLACES_API_KEY` is configured for business search. `DEV_MAGIC_LINK_ENABLED`, `LEGACY_GOOGLE_CAPTURE_ENABLED`, and `WEEKLY_EMAIL_ENABLED` remain `false`. Enable the weekly email only after the sender is verified and an authorized capture source is operating; each business must also opt in from Settings. Vercel sends `CRON_SECRET` as a bearer token to the protected endpoint.
