-- ============================================================================
-- Portfolio CMS - Static-client policies
-- Run AFTER 0001_schema.sql and 0002_rls_policies.sql.
--
-- The static (HTML/CSS/JS) version has no server, so there is no service-role
-- key in the browser. Two operations that previously ran server-side now run
-- directly from the browser and need their own RLS policies:
--
--   1. The public contact form inserts as the anonymous role.
--   2. The signed-in administrator writes its own audit-log entries.
--
-- Everything else from 0002 is unchanged and still applies.
-- ============================================================================

-- 1. Public contact form: allow anonymous INSERT, constrained -------------
-- Anyone can SEND a message (no account needed) but still cannot READ, UPDATE
-- or DELETE messages - those remain admin-only from 0002. The WITH CHECK
-- constraints reject empty/oversized junk at the database level. Client-side
-- honeypot + timing add spam protection on top (see js/contact.js).
drop policy if exists "anon can send contact message" on public.contact_messages;
create policy "anon can send contact message"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    char_length(name)    between 1 and 120  and
    char_length(email)   between 3 and 200  and
    char_length(message) between 10 and 5000 and
    char_length(coalesce(subject, '')) <= 200 and
    -- these are set by the server-only path in the Next version; force them
    -- off for browser inserts so a visitor can't pre-mark a message read.
    is_read = false and
    is_archived = false
  );

-- 2. Audit log: allow the signed-in admin to append entries ---------------
-- Still no UPDATE/DELETE policy, so the log stays append-only even for admins.
drop policy if exists "admin insert audit_logs" on public.audit_logs;
create policy "admin insert audit_logs"
  on public.audit_logs
  for insert
  to authenticated
  with check (public.is_admin() and actor_id = auth.uid());
