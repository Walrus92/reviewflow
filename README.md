# ReviewFlow

ReviewFlow is an incremental rebuild of an existing competitive reputation intelligence application. The existing Supabase data is retained. The change-focused dashboard, read-only history, metric insights, alerts, competitor management, opt-in weekly digest endpoint, and fictional review-analysis demo are implemented. Automatic capture and a trusted scheduler are not yet connected.

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

## Vercel deployment

`vercel.json` schedules a daily check at 08:00 UTC in production. The job sends each opted-in profile at most once per seven days and only when a capture occurred in that period. A daily check allows recovery after an invocation fails. The schedule uses Vercel's production cron. The `reviewflow` Vercel project is connected to `Walrus92/reviewflow`; no deployment has been published yet.

Production variables are configured in Vercel, except `RESEND_FROM_EMAIL`, which needs a verified sender domain. `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` currently use the project's assigned HTTPS domain. `GOOGLE_PLACES_API_KEY` is configured for business search. `DEV_MAGIC_LINK_ENABLED`, `LEGACY_GOOGLE_CAPTURE_ENABLED`, and `WEEKLY_EMAIL_ENABLED` remain `false`. Enable the weekly email only after the sender is verified and an authorized capture source is operating; each business must also opt in from Settings. Vercel sends `CRON_SECRET` as a bearer token to the protected endpoint.
