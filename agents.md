\# ReviewFlow



\## Product goal



ReviewFlow is a competitive reputation intelligence platform for local businesses.



The main value is not merely displaying reviews or ratings.



The product must detect meaningful changes over time and across competitors.



Core loop:



data -> snapshots -> history -> comparison -> change detection -> insights -> alerts



\## Product principles



\- Reuse existing code whenever reasonable.

\- Do not rewrite the application from scratch.

\- Do not introduce new frameworks without a strong reason.

\- Prefer simple architecture over premature abstraction.

\- Every feature must solve a real user problem.

\- Avoid vanity dashboards and decorative metrics.

\- Prioritize differences, trends and actionable changes.



\## Core MVP



\- User authentication

\- Business onboarding

\- Competitor tracking

\- Business snapshots

\- Competitor snapshots

\- Historical comparisons

\- Change detection

\- Reputation intelligence dashboard

\- Alerts

\- Review analysis

\- Automated insights

\- Weekly email summary



\## Development rules



\- Make small, testable changes.

\- Do not delete existing functionality without explaining why.

\- Before major refactors, describe the impact.

\- Preserve backwards compatibility where possible.

\- Keep database migrations explicit and reversible.

\- Never commit secrets or API keys.

\- Use environment variables for credentials.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
