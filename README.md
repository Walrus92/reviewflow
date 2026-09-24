# ReviewFlow

ReviewFlow continues the existing Supabase project as a competitive reputation intelligence application. The account, dashboard, manual pilot captures, history, alerts, competitor links, fictional demo, optional owner CSV import, and disabled-by-default weekly digest are retained. The primary own-review flow now uses a business owner's **Google Business Profile OAuth authorization** and reads reviews directly from the managed listing. It does not ask each customer for an API key or a CSV.

## Local setup

Requirements: Node.js 22+, npm, Supabase access, and Resend for production email sign-in.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and supply the server credentials. Never commit `.env.local`.
3. Run `npm run dev`, then open `http://localhost:3000/login`. `/demo` has fictional data and requires no API access.

For a local session without Resend, start Docker Desktop, run `npx supabase start`, then `npm run dev:local`. The script uses the local Supabase service key and shows a one-time link for localhost sign-in. This does not modify `.env.local` or send real email. The baseline and migrations under `supabase/migrations` were tested against local Supabase and applied to the existing remote project.

Checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`. On Windows, `next.config.ts` uses one static generation worker to avoid a previously observed local build crash.

## Connect a real managed business

1. Sign in and save a name supplied by the owner in Settings.
2. Choose **Connect with Google**. The owner or manager signs in and approves the `business.manage` OAuth scope.
3. Select one of the locations returned from the account they manage. ReviewFlow verifies the choice against Google and binds its Place ID to the profile. An existing profile with history but no Place ID asks for explicit confirmation before its first binding; a profile with history cannot switch to a different business. Google location titles are shown only while choosing; ReviewFlow retains the owner-entered name.
4. Open Dashboard or Reviews. The app reads the authorized location's review pages directly from Google (50 per request, up to 200 reviews in the interface), displays the current average rating and review count, and calculates supported qualitative findings in memory. The response and browser request use `no-store`. Text and derived findings from Google are not inserted into Supabase. If more than 200 reviews are available, temporal trend findings are withheld because the sample is incomplete.

This flow needs a Google Cloud project approved for Business Profile APIs, a verified managed listing, and an OAuth web client. Google states that applicants must manage a verified, active Business Profile for at least 60 days and have a website representing that business. See its [prerequisites](https://developers.google.com/my-business/content/prereqs), [OAuth setup](https://developers.google.com/my-business/content/implement-oauth), and [review listing API](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list). There is no real Google connection in the project yet: `GOOGLE_BUSINESS_CLIENT_ID`, `GOOGLE_BUSINESS_CLIENT_SECRET`, and `GOOGLE_TOKEN_ENCRYPTION_KEY` are not set in the local configuration. Register `https://project-qdebw.vercel.app/api/google-business/callback` and the localhost equivalent as authorized redirect URIs. Keep the encryption key stable because changing it invalidates stored refresh tokens.

Google's [Business Profile API policies](https://developers.google.com/my-business/content/policies) restrict storing API content. The former daily job that persisted Google rating/review-count snapshots is disabled and removed from Vercel's cron schedule pending a reviewed retention basis. The live page cannot reconstruct historical rating values from before the first authorized observation. Owner-entered manual captures remain available as an optional pilot tool and are explicitly marked `manual_owner`.

## Source boundaries

Google Places routes that searched or persisted places for this workflow return 410. A Places API key does not grant the full competitor review corpus or historical storage rights. [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) exempt Place IDs from caching restrictions but restrict other content; [EEA permitted uses](https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses) do not clearly include competitive reputation intelligence. The old Google Places and Google Business Profile snapshot rows remain in Supabase for audit, but the operating dashboard, history, and alerts now use only manual-owner snapshots. Do not re-enable competitive capture through Places without a specific permitted-use and retention review.

The optional CSV importer is under a collapsed section on `/reviews` for owner-provided data from a source the owner declares they may analyze and retain. The declaration is not verified by ReviewFlow. It accepts `fecha,estrellas,texto` and optional stable `id`, limits publication dates to the last 90 days, supports corrections and deletion, and has a daily retention purge. The fictional demo never inserts reviews into Supabase. Competitor review text remains a demo-only capability until a source licenses the required use and retention.

## Security and deployment

The browser never receives the Supabase service-role key. Direct `anon` and `authenticated` table access was revoked and RLS enabled. Server routes resolve the signed-in profile and check ownership. Google refresh tokens are encrypted on the server; the temporary location-selection ticket is signed, contains only an encrypted refresh token, uses an HttpOnly cookie, and expires after ten minutes. A customer revokes access by disconnecting Google in Settings.

The `reviewflow` Vercel project is connected to `Walrus92/reviewflow` and published at `https://project-qdebw.vercel.app`. The migration branch has been deployed manually to Production; this branch's new Google flow must be deployed before use. Builds now complete without Supabase credentials, but Preview routes need their own Supabase variables before that environment can serve real data. `vercel.json` keeps only the daily review-text retention and email check at 08:00 UTC. Weekly email remains disabled globally until a verified Resend sender and a suitable source of recurring findings are available. The configured `CRON_SECRET` protects the job endpoint.

See [current migration state](docs/current-state.md), the [MVP feature matrix](docs/mvp-matrix.md), and the [competitive data source decision](docs/competitive-source-decision.md).
