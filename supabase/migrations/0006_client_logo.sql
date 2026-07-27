-- ============================================================================
-- Portfolio CMS - client logo for the homepage "Featured Clients" grid
-- Run AFTER the earlier migrations. Additive only.
--
-- The homepage no longer shows featured project cards; instead it shows a grid
-- of client logos. Clicking a logo opens that client's project detail page.
-- ============================================================================

alter table public.projects add column if not exists client_logo text;  -- URL of the client's logo image
