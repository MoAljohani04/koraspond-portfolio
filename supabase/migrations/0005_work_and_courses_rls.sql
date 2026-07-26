-- ============================================================================
-- Portfolio CMS - RLS for the "My Work" + "Courses" extension
-- Run AFTER 0004_work_and_courses.sql.
--
-- Same model as 0002: public can SELECT public/published rows, admin can do
-- everything (verified via public.is_admin()).
-- ============================================================================

alter table public.project_category_map enable row level security;
alter table public.project_videos       enable row level security;
alter table public.course_categories    enable row level security;
alter table public.courses               enable row level security;

-- ── project_category_map: visible when the parent project is published ──────
drop policy if exists "public read map of published projects" on public.project_category_map;
create policy "public read map of published projects" on public.project_category_map for select
  using (
    public.is_admin() or exists (
      select 1 from public.projects p
      where p.id = project_id and p.status = 'published'
    )
  );
drop policy if exists "admin write project_category_map" on public.project_category_map;
create policy "admin write project_category_map" on public.project_category_map for all
  using (public.is_admin()) with check (public.is_admin());

-- ── project_videos: visible when the parent project is published ────────────
drop policy if exists "public read videos of published projects" on public.project_videos;
create policy "public read videos of published projects" on public.project_videos for select
  using (
    public.is_admin() or exists (
      select 1 from public.projects p
      where p.id = project_id and p.status = 'published'
    )
  );
drop policy if exists "admin write project_videos" on public.project_videos;
create policy "admin write project_videos" on public.project_videos for all
  using (public.is_admin()) with check (public.is_admin());

-- ── course_categories: public metadata, admin write ────────────────────────
drop policy if exists "public read course_categories" on public.course_categories;
create policy "public read course_categories" on public.course_categories for select using (true);
drop policy if exists "admin write course_categories" on public.course_categories;
create policy "admin write course_categories" on public.course_categories for all
  using (public.is_admin()) with check (public.is_admin());

-- ── courses: public sees published, admin sees all ─────────────────────────
drop policy if exists "public read published courses" on public.courses;
create policy "public read published courses" on public.courses for select
  using (status = 'published' or public.is_admin());
drop policy if exists "admin write courses" on public.courses;
create policy "admin write courses" on public.courses for all
  using (public.is_admin()) with check (public.is_admin());
