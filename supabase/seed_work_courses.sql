-- ============================================================================
-- Portfolio CMS - Seed data for "My Work" categories + "Courses"
-- Run AFTER 0004_work_and_courses.sql, 0005_work_and_courses_rls.sql and the
-- original seed.sql. Safe to re-run.
-- ============================================================================

-- Give the existing project categories a short description + icon so the
-- category cards on /work look complete out of the box.
update public.project_categories set description = v.descr, icon = v.icon
from (values
  ('rfp-vendor-responses',   'Structured, professional RFP vendor response documents.',        'document'),
  ('website-translation',    'Website localization for multi-language accessibility.',          'globe'),
  ('website-design',         'Responsive, modern, user-friendly website designs.',              'monitor'),
  ('wordpress-development',  'Custom WordPress themes, plugins and page-builder sites.',         'wordpress'),
  ('figma-ui-ux-design',     'UI/UX designs, wireframes and interactive prototypes in Figma.',   'figma'),
  ('ai-tools',               'Solutions built with Claude, ChatGPT and other AI tooling.',       'brain'),
  ('chatbot-kiosk',          'Interactive kiosk interfaces with an integrated chatbot.',         'chat'),
  ('website-health-crawler', 'A crawler that monitors website health, status and performance.',  'pulse')
) as v(slug, descr, icon)
where public.project_categories.slug = v.slug;

-- Course categories -----------------------------------------------------------
insert into public.course_categories (name, slug, display_order) values
  ('AI & Machine Learning', 'ai-machine-learning', 0),
  ('Prompt Engineering',    'prompt-engineering',  1),
  ('Web Development',       'web-development',      2),
  ('Design',               'design',               3)
on conflict (slug) do nothing;

-- Courses (grouped by provider - e.g. clicking "Anthropic" shows these) -------
insert into public.courses
  (title, slug, provider, instructor, short_description, description, skills,
   category_id, completion_date, featured, featured_order, display_order, status)
select v.title, v.slug, v.provider, v.instructor, v.descr, v.long, v.skills,
       (select id from public.course_categories where slug = v.cat),
       v.done::date, v.feat, v.ord, v.ord, 'published'
from (values
  ('AI Fluency: Framework & Foundations', 'ai-fluency-framework-foundations',
   'Anthropic', 'Anthropic Academy',
   'Foundations of working effectively and responsibly with AI systems.',
   'A foundational course covering how large language models work, effective collaboration with AI, and responsible, safe usage in real projects.',
   'AI Safety, Responsible AI, Model Fundamentals',
   'ai-machine-learning', '2025-06-01', true, 0),
  ('Prompt Engineering with Claude', 'prompt-engineering-with-claude',
   'Anthropic', 'Anthropic Academy',
   'Designing clear, reliable prompts and workflows with Claude.',
   'Hands-on techniques for structuring prompts, giving context, chaining steps and evaluating outputs to get consistent, high-quality results from Claude.',
   'Prompt Engineering, Claude, Workflow Design',
   'prompt-engineering', '2025-06-15', true, 1),
  ('Building with the Claude API', 'building-with-the-claude-api',
   'Anthropic', 'Anthropic Academy',
   'Integrating Claude into applications through the API.',
   'Covers authentication, messages, tools, streaming and best practices for building production features on top of the Claude API.',
   'API Integration, JavaScript, Tool Use',
   'web-development', '2025-07-01', false, 2)
) as v(title, slug, provider, instructor, descr, long, skills, cat, done, feat, ord)
on conflict (slug) do nothing;
