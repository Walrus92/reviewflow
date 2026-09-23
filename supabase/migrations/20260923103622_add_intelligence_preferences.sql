ALTER TABLE public.profiles
  ADD COLUMN last_dashboard_seen_at timestamptz,
  ADD COLUMN weekly_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN weekly_email_last_sent_at timestamptz;

-- Rollback: ALTER TABLE public.profiles DROP COLUMN weekly_email_last_sent_at,
-- DROP COLUMN weekly_email_enabled, DROP COLUMN last_dashboard_seen_at;
