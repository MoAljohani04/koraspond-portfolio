-- ============================================================================
-- Portfolio CMS - drop client names from project titles
--
-- The public site presents work by industry rather than by client branding, so
-- `projectTitle()` in js/helpers.js already strips these names when a page is
-- rendered. Run this once (Supabase Dashboard -> SQL Editor) to make the change
-- in the data itself; after that the render-time strip finds nothing to remove
-- and every title passes through untouched.
--
-- Slugs are deliberately left alone so existing links keep resolving.
-- Safe to re-run: each statement only matches the old title.
-- ============================================================================

update public.projects set title = 'WhatsApp Chatbot Solution'
  where title = 'Al Borg WhatsApp Chatbot Solution';

update public.projects set title = 'Website Experience Transformation Platform'
  where title = 'Al Borg Website Experience Transformation Platform';

update public.projects set title = 'Customer Experience and CRM Platform'
  where title = 'Al Borg Customer Experience and CRM Platform';

update public.projects set title = 'Annual Report Microsite'
  where title = 'ICIEC Annual Report Microsite';

update public.projects set title = 'Arabic Localization'
  where title = 'ICIEC Arabic Localization';

update public.projects set title = 'Stations Website'
  where title = 'Aramco Stations Website';

-- Left as they are - no client name in the title:
--   'Mall Kiosk ChatBot 3D Interactive Map'
--   'Website Health Monitor'

select title, slug from public.projects order by display_order;
