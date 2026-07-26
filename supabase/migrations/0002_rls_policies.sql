-- ============================================================================
-- Portfolio CMS - Row-Level Security
-- Run after 0001_schema.sql.
--
-- Model:
--   * anon / public:  SELECT only, and only rows with status = 'published'
--                     (singleton settings tables are fully readable - they
--                     contain only public display content).
--   * admin:          full access, verified via public.is_admin().
--   * contact_messages and audit tables: NO public access at all; inserts go
--     through the server (service role) after validation + rate limiting.
-- ============================================================================

-- Enable RLS everywhere
alter table public.admin_users          enable row level security;
alter table public.site_settings        enable row level security;
alter table public.profile              enable row level security;
alter table public.hero                 enable row level security;
alter table public.experiences          enable row level security;
alter table public.experience_items     enable row level security;
alter table public.project_categories   enable row level security;
alter table public.projects             enable row level security;
alter table public.project_images       enable row level security;
alter table public.project_technologies enable row level security;
alter table public.skill_categories     enable row level security;
alter table public.skills               enable row level security;
alter table public.certificates         enable row level security;
alter table public.social_links         enable row level security;
alter table public.contact_settings     enable row level security;
alter table public.contact_messages     enable row level security;
alter table public.media                enable row level security;
alter table public.content_revisions    enable row level security;
alter table public.audit_logs           enable row level security;

-- admin_users: an admin may read the allowlist; nobody may write via API --
drop policy if exists "admin can read admin_users" on public.admin_users;
create policy "admin can read admin_users"
  on public.admin_users for select
  using (public.is_admin());

-- Singleton settings tables: public read, admin write ----------------------------------------------------------------------
drop policy if exists "public read site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings for select using (true);
drop policy if exists "admin write site_settings" on public.site_settings;
create policy "admin write site_settings" on public.site_settings for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read profile" on public.profile;
create policy "public read profile" on public.profile for select using (true);
drop policy if exists "admin write profile" on public.profile;
create policy "admin write profile" on public.profile for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read hero" on public.hero;
create policy "public read hero" on public.hero for select using (true);
drop policy if exists "admin write hero" on public.hero;
create policy "admin write hero" on public.hero for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read contact_settings" on public.contact_settings;
create policy "public read contact_settings" on public.contact_settings for select using (true);
drop policy if exists "admin write contact_settings" on public.contact_settings;
create policy "admin write contact_settings" on public.contact_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- Status-gated content: public sees published only, admin sees all -------
-- experiences
drop policy if exists "public read published experiences" on public.experiences;
create policy "public read published experiences" on public.experiences for select
  using (status = 'published' or public.is_admin());
drop policy if exists "admin write experiences" on public.experiences;
create policy "admin write experiences" on public.experiences for all
  using (public.is_admin()) with check (public.is_admin());

-- experience_items
drop policy if exists "public read published experience_items" on public.experience_items;
create policy "public read published experience_items" on public.experience_items for select
  using (status = 'published' or public.is_admin());
drop policy if exists "admin write experience_items" on public.experience_items;
create policy "admin write experience_items" on public.experience_items for all
  using (public.is_admin()) with check (public.is_admin());

-- project_categories (no status column - categories are public metadata)
drop policy if exists "public read project_categories" on public.project_categories;
create policy "public read project_categories" on public.project_categories for select using (true);
drop policy if exists "admin write project_categories" on public.project_categories;
create policy "admin write project_categories" on public.project_categories for all
  using (public.is_admin()) with check (public.is_admin());

-- projects
drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects" on public.projects for select
  using (status = 'published' or public.is_admin());
drop policy if exists "admin write projects" on public.projects;
create policy "admin write projects" on public.projects for all
  using (public.is_admin()) with check (public.is_admin());

-- project_images: visible when parent project is published
drop policy if exists "public read images of published projects" on public.project_images;
create policy "public read images of published projects" on public.project_images for select
  using (
    public.is_admin() or exists (
      select 1 from public.projects p
      where p.id = project_id and p.status = 'published'
    )
  );
drop policy if exists "admin write project_images" on public.project_images;
create policy "admin write project_images" on public.project_images for all
  using (public.is_admin()) with check (public.is_admin());

-- project_technologies: visible when parent project is published
drop policy if exists "public read tech of published projects" on public.project_technologies;
create policy "public read tech of published projects" on public.project_technologies for select
  using (
    public.is_admin() or exists (
      select 1 from public.projects p
      where p.id = project_id and p.status = 'published'
    )
  );
drop policy if exists "admin write project_technologies" on public.project_technologies;
create policy "admin write project_technologies" on public.project_technologies for all
  using (public.is_admin()) with check (public.is_admin());

-- skill_categories
drop policy if exists "public read skill_categories" on public.skill_categories;
create policy "public read skill_categories" on public.skill_categories for select using (true);
drop policy if exists "admin write skill_categories" on public.skill_categories;
create policy "admin write skill_categories" on public.skill_categories for all
  using (public.is_admin()) with check (public.is_admin());

-- skills
drop policy if exists "public read published skills" on public.skills;
create policy "public read published skills" on public.skills for select
  using (status = 'published' or public.is_admin());
drop policy if exists "admin write skills" on public.skills;
create policy "admin write skills" on public.skills for all
  using (public.is_admin()) with check (public.is_admin());

-- certificates
drop policy if exists "public read published certificates" on public.certificates;
create policy "public read published certificates" on public.certificates for select
  using (status = 'published' or public.is_admin());
drop policy if exists "admin write certificates" on public.certificates;
create policy "admin write certificates" on public.certificates for all
  using (public.is_admin()) with check (public.is_admin());

-- social_links
drop policy if exists "public read published social_links" on public.social_links;
create policy "public read published social_links" on public.social_links for select
  using (status = 'published' or public.is_admin());
drop policy if exists "admin write social_links" on public.social_links;
create policy "admin write social_links" on public.social_links for all
  using (public.is_admin()) with check (public.is_admin());

-- contact_messages: admin only. Public inserts happen server-side via
--    service role after validation, honeypot and rate limiting. -------------
drop policy if exists "admin read contact_messages" on public.contact_messages;
create policy "admin read contact_messages" on public.contact_messages for select
  using (public.is_admin());
drop policy if exists "admin update contact_messages" on public.contact_messages;
create policy "admin update contact_messages" on public.contact_messages for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete contact_messages" on public.contact_messages;
create policy "admin delete contact_messages" on public.contact_messages for delete
  using (public.is_admin());

-- media: admin only via API (public access is through the storage CDN) ---
drop policy if exists "admin all media" on public.media;
create policy "admin all media" on public.media for all
  using (public.is_admin()) with check (public.is_admin());

-- content_revisions: admin only ----------------------------------------------------------------------
drop policy if exists "admin all content_revisions" on public.content_revisions;
create policy "admin all content_revisions" on public.content_revisions for all
  using (public.is_admin()) with check (public.is_admin());

-- audit_logs: admin read; inserts via service role only ------------------
drop policy if exists "admin read audit_logs" on public.audit_logs;
create policy "admin read audit_logs" on public.audit_logs for select
  using (public.is_admin());

-- ============================================================================
-- Storage: single public bucket "media" with per-purpose folders.
-- Public can read; only admins can write/delete.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true,
  10485760, -- 10 MB
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/pdf']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read media objects" on storage.objects;
create policy "public read media objects" on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "admin insert media objects" on storage.objects;
create policy "admin insert media objects" on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin update media objects" on storage.objects;
create policy "admin update media objects" on storage.objects for update
  using (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin delete media objects" on storage.objects;
create policy "admin delete media objects" on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());
