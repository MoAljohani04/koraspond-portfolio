-- ============================================================================
-- Portfolio CMS - Schema
-- Run this first (Supabase Dashboard -> SQL Editor, or `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- Enums ----------------------------------------------------------------------
do $$ begin
  create type public.content_status as enum ('draft', 'published', 'hidden');
exception when duplicate_object then null; end $$;

-- Admin users (allowlist) ----------------------------------------------------------------------
-- A Supabase Auth user is only an administrator if their id is in this table.
create table if not exists public.admin_users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- Helper used by every RLS policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;

-- Promote an existing Auth user to admin by email.
-- Usage (SQL editor):  select public.promote_admin('you@example.com');
create or replace function public.promote_admin(admin_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(admin_email) limit 1;
  if uid is null then
    raise exception 'No auth user found with email %. Create the user in Supabase Auth first.', admin_email;
  end if;
  insert into public.admin_users (id, email)
  values (uid, lower(admin_email))
  on conflict (id) do nothing;
end;
$$;

-- Lock down: only service role / SQL editor may call promote_admin.
revoke execute on function public.promote_admin(text) from public, anon, authenticated;

-- updated_at trigger ----------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Site settings (single row) ----------------------------------------------------------------------
create table if not exists public.site_settings (
  id               uuid primary key default gen_random_uuid(),
  site_title       text not null default 'Portfolio',
  meta_description text not null default '',
  og_image_url     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id)
);

-- Personal profile (single row) ----------------------------------------------------------------------
create table if not exists public.profile (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null default '',
  headline_role text not null default '',
  about        text not null default '',
  email        text not null default '',
  phone        text,
  location     text,
  linkedin_url text,
  cv_url       text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id)
);

-- Hero (single row) ----------------------------------------------------------------------
create table if not exists public.hero (
  id                 uuid primary key default gen_random_uuid(),
  eyebrow            text not null default 'PORTFOLIO',
  headline           text not null default '',
  highlighted_text   text not null default '',
  description        text not null default '',
  primary_label      text not null default 'View My Work',
  primary_url        text not null default '#projects',
  primary_visible    boolean not null default true,
  secondary_label    text not null default 'Contact Me',
  secondary_url      text not null default '#contact',
  secondary_visible  boolean not null default true,
  background_image   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by         uuid references auth.users (id)
);

-- Work experience ----------------------------------------------------------------------
create table if not exists public.experiences (
  id              uuid primary key default gen_random_uuid(),
  company         text not null,
  role            text not null,
  department      text,
  employment_type text,
  start_date      date,
  end_date        date,
  duration_label  text,
  logo_url        text,
  description     text not null default '',
  display_order   int not null default 0,
  status          public.content_status not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_by      uuid references auth.users (id)
);

-- "What I Worked On" cards / responsibilities & achievements per experience.
create table if not exists public.experience_items (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  title         text not null,
  description   text not null default '',
  icon          text not null default 'sparkles',
  display_order int not null default 0,
  status        public.content_status not null default 'published',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id)
);

-- Projects ----------------------------------------------------------------------
create table if not exists public.project_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          text not null unique,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id)
);

create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  short_description text not null default '',
  case_study        text not null default '',           -- sanitized rich-text HTML
  cover_image       text,
  category_id       uuid references public.project_categories (id) on delete set null,
  project_date      date,
  client_name       text,
  project_url       text,
  github_url        text,
  project_state     text not null default 'completed',  -- completed | in-progress | archived
  featured          boolean not null default false,
  featured_order    int not null default 0,
  display_order     int not null default 0,
  status            public.content_status not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id),
  updated_by        uuid references auth.users (id)
);

create table if not exists public.project_images (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  url           text not null,
  alt           text not null default '',
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id)
);

create table if not exists public.project_technologies (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  name          text not null,
  display_order int not null default 0
);

-- Skills ----------------------------------------------------------------------
create table if not exists public.skill_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  display_order int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id)
);

create table if not exists public.skills (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  icon_url      text,
  category_id   uuid references public.skill_categories (id) on delete set null,
  proficiency   int check (proficiency between 1 and 5),
  display_order int not null default 0,
  status        public.content_status not null default 'published',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id)
);

-- Certificates ----------------------------------------------------------------------
create table if not exists public.certificates (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  organization  text not null default '',
  issue_date    date,
  description   text not null default '',
  image_url     text,
  file_url      text,
  verify_url    text,
  display_order int not null default 0,
  status        public.content_status not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id)
);

-- Social links ----------------------------------------------------------------------
create table if not exists public.social_links (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null,          -- linkedin | github | email | other
  label         text not null default '',
  url           text not null,
  display_order int not null default 0,
  status        public.content_status not null default 'published',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id),
  updated_by    uuid references auth.users (id)
);

-- Contact ----------------------------------------------------------------------
create table if not exists public.contact_settings (
  id              uuid primary key default gen_random_uuid(),
  heading         text not null default 'Get in touch',
  description     text not null default '',
  public_email    text not null default '',
  recipient_email text not null default '',
  success_message text not null default 'Thanks! Your message has been sent.',
  error_message   text not null default 'Something went wrong. Please try again.',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users (id)
);

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text not null default '',
  message     text not null,
  is_read     boolean not null default false,
  is_archived boolean not null default false,
  ip_hash     text,
  created_at  timestamptz not null default now()
);

-- Media library ----------------------------------------------------------------------
create table if not exists public.media (
  id         uuid primary key default gen_random_uuid(),
  filename   text not null,
  path       text not null unique,     -- storage object path, e.g. projects/abc.png
  url        text not null,            -- public URL
  folder     text not null default 'general',
  alt        text not null default '',
  size_bytes bigint not null default 0,
  mime_type  text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

-- Content revisions (restore previous version) ----------------------------------------------------------------------
create table if not exists public.content_revisions (
  id         uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id  uuid not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index if not exists content_revisions_record_idx
  on public.content_revisions (table_name, record_id, created_at desc);

-- Audit log ----------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  actor_email text,
  action      text not null,            -- create | update | delete | publish | ...
  table_name  text not null,
  record_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- updated_at triggers ----------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'site_settings','profile','hero','experiences','experience_items',
    'project_categories','projects','skills','skill_categories','certificates',
    'social_links','contact_settings'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
