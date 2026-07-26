-- ============================================================================
-- Portfolio CMS - "My Work" + "Courses" extension
-- Run AFTER 0001_schema.sql, 0002_rls_policies.sql, 0003_static_client_policies.sql.
--
-- Everything here is ADDITIVE. No existing column is dropped or renamed, so the
-- current site keeps working while the new sections come online.
--
--   * projects            -> richer case-study fields (objectives, role, …)
--   * project_categories  -> description / icon / cover for category cards
--   * project_category_map-> many-to-many (a project in several categories)
--   * project_videos      -> uploaded or embedded project videos
--   * course_categories   -> dynamic course taxonomy
--   * courses             -> completed courses grouped by provider
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Projects: extra case-study fields ───────────────────────────────────────
alter table public.projects add column if not exists objectives   text not null default '';
alter table public.projects add column if not exists role          text not null default '';   -- "My role"
alter table public.projects add column if not exists duration_text text;                        -- e.g. "3 weeks"
alter table public.projects add column if not exists challenges    text not null default '';   -- challenges & solutions
alter table public.projects add column if not exists outcome       text not null default '';   -- final outcome
alter table public.projects add column if not exists project_type  text;                        -- e.g. "Web App", "Branding"
alter table public.projects add column if not exists behance_url   text;
alter table public.projects add column if not exists cover_alt     text not null default '';   -- alt text for the cover image

-- ── Project categories: fields for the category cards on /work ──────────────
alter table public.project_categories add column if not exists description text not null default '';
alter table public.project_categories add column if not exists icon        text not null default 'sparkles';
alter table public.project_categories add column if not exists cover_image text;

-- ── Many-to-many: a project can live in several categories ──────────────────
-- projects.category_id stays as the "primary" category (backward compatible).
-- This map is the authoritative multi-category assignment used by /work.
create table if not exists public.project_category_map (
  project_id  uuid not null references public.projects (id)           on delete cascade,
  category_id uuid not null references public.project_categories (id) on delete cascade,
  primary key (project_id, category_id)
);
create index if not exists project_category_map_cat_idx on public.project_category_map (category_id);

-- Backfill the map from the existing single category_id so nothing is lost.
insert into public.project_category_map (project_id, category_id)
select id, category_id from public.projects
where category_id is not null
on conflict do nothing;

-- ── Project videos (uploaded file URL or an embed like YouTube/Vimeo) ───────
create table if not exists public.project_videos (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  url           text not null,
  provider      text not null default 'embed',   -- embed | file
  title         text not null default '',
  display_order int  not null default 0,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id)
);
create index if not exists project_videos_project_idx on public.project_videos (project_id);

-- ── Course categories (dynamic taxonomy, like project_categories) ───────────
create table if not exists public.course_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          text not null unique,
  display_order int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id)
);

-- ── Courses ─────────────────────────────────────────────────────────────────
create table if not exists public.courses (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  provider          text not null default '',          -- institution / platform (e.g. "Anthropic")
  provider_logo     text,                               -- optional provider logo
  instructor        text,
  completion_date   date,
  category_id       uuid references public.course_categories (id) on delete set null,
  short_description text not null default '',
  description       text not null default '',
  skills            text not null default '',          -- comma-separated skills learned
  certificate_image text,
  certificate_alt   text not null default '',
  certificate_file  text,                               -- PDF
  certificate_id    text,
  verify_url        text,
  course_url        text,                               -- link to the course itself
  featured          boolean not null default false,
  featured_order    int  not null default 0,
  display_order     int  not null default 0,
  status            public.content_status not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id),
  updated_by        uuid references auth.users (id)
);
create index if not exists courses_provider_idx on public.courses (provider);
create index if not exists courses_category_idx on public.courses (category_id);

-- ── updated_at triggers for the new tables that carry updated_at ────────────
do $$
declare t text;
begin
  foreach t in array array['project_categories','courses','course_categories'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
