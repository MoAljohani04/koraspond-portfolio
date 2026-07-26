-- ============================================================================
-- Portfolio CMS - Seed data
-- Run after both migrations. Safe to re-run (idempotent-ish: it skips
-- singletons that already exist and upserts named rows).
-- ============================================================================

-- Site settings ----------------------------------------------------------------------
insert into public.site_settings (site_title, meta_description)
select 'Aqsa Arif - Co-op Intern | Technology',
       'Portfolio of Aqsa Arif, Co-op Intern at KORASpond - turning ideas into impactful solutions.'
where not exists (select 1 from public.site_settings);

-- Profile ----------------------------------------------------------------------
insert into public.profile (full_name, headline_role, about, email, location, linkedin_url)
select 'Aqsa Arif',
       'Co-op Intern | Technology',
       'Co-op Intern at KORASpond - 1.5 months of learning, building, and contributing to real-world projects.',
       'hello@example.com',
       '',
       ''
where not exists (select 1 from public.profile);

-- Hero ----------------------------------------------------------------------
insert into public.hero (eyebrow, headline, highlighted_text, description,
                         primary_label, primary_url, secondary_label, secondary_url)
select 'PORTFOLIO',
       'Turning Ideas into',
       'Impactful Solutions.',
       'Co-op Intern at KORASpond - 1.5 months of learning, building, and contributing to real-world projects.',
       'View My Work', '#projects',
       'Contact Me', '#contact'
where not exists (select 1 from public.hero);

-- Contact settings ----------------------------------------------------------------------
insert into public.contact_settings (heading, description, public_email, recipient_email)
select 'Let''s connect and build something great together.',
       'Thank you for visiting my portfolio! Send me a message and I''ll get back to you.',
       'hello@example.com',
       'hello@example.com'
where not exists (select 1 from public.contact_settings);

-- Work experience: KORASpond ----------------------------------------------------------------------
insert into public.experiences
  (company, role, department, employment_type, duration_label, description, display_order, status)
select 'KORASpond', 'Co-op Intern', 'Technology Department', 'Co-op Internship', '1.5 Months',
       'During my internship, I worked on diverse projects and tasks that strengthened my technical, design, and problem-solving skills.',
       0, 'published'
where not exists (select 1 from public.experiences where company = 'KORASpond');

-- Responsibilities / "What I Worked On" cards
with exp as (select id from public.experiences where company = 'KORASpond' limit 1)
insert into public.experience_items (experience_id, title, description, icon, display_order, status)
select exp.id, v.title, v.description, v.icon, v.ord, 'published'
from exp, (values
  ('RFP Vendor Responses',   'Prepared RFP vendor responses for multiple clients with clear, structured and professional content.', 'document',   0),
  ('Website Translation',    'Translated websites to support multi-language accessibility using professional localization practices.', 'globe',   1),
  ('Website Design',         'Designed responsive and modern websites that are user-friendly and aligned with client needs.', 'monitor',          2),
  ('Using WordPress',        'Built and customized websites using WordPress including themes, plugins and page builders.', 'wordpress',           3),
  ('Figma Design',           'Created UI/UX designs, wireframes and prototypes using Figma.', 'figma',                                            4),
  ('AI Tools',               'Leveraged Claude and ChatGPT AI tools to improve productivity, generate content and solve problems.', 'brain',      5),
  ('Chatbot Kiosk',          'Designed a kiosk interface integrated with a chatbot for better user interaction and assistance.', 'chat',          6),
  ('Website Health Crawler', 'Built a website to crawl other websites and monitor their health, status and performance.', 'pulse',                7),
  ('Anthropic Academy',      'Completed courses from Anthropic Academy on AI safety, prompt engineering and responsible AI usage.', 'sparkles',   8)
) as v(title, description, icon, ord)
where not exists (
  select 1 from public.experience_items ei
  where ei.experience_id = exp.id and ei.title = v.title
);

-- Project categories ----------------------------------------------------------------------
insert into public.project_categories (name, slug, display_order) values
  ('RFP Vendor Responses',   'rfp-vendor-responses',   0),
  ('Website Translation',    'website-translation',    1),
  ('Website Design',         'website-design',         2),
  ('WordPress Development',  'wordpress-development',  3),
  ('Figma UI/UX Design',     'figma-ui-ux-design',     4),
  ('AI Tools',               'ai-tools',               5),
  ('Chatbot Kiosk',          'chatbot-kiosk',          6),
  ('Website Health Crawler', 'website-health-crawler', 7)
on conflict (slug) do nothing;

-- Featured projects (from the current site) ----------------------------------------------------------------------
insert into public.projects
  (title, slug, short_description, category_id, featured, featured_order, display_order, status)
select v.title, v.slug, v.descr,
       (select id from public.project_categories where slug = v.cat),
       true, v.ord, v.ord, 'published'
from (values
  ('RFP Vendor Response',      'rfp-vendor-response',
   'Created comprehensive RFP responses for various clients addressing technical and business requirements.',
   'rfp-vendor-responses', 0),
  ('Website Translation',      'website-translation',
   'Translated and localized websites to reach global audiences and improve accessibility.',
   'website-translation', 1),
  ('Website Design (WordPress)', 'website-design-wordpress',
   'Designed and developed responsive websites using WordPress with custom themes and plugins.',
   'wordpress-development', 2),
  ('Chatbot Kiosk',            'chatbot-kiosk',
   'Designed an interactive kiosk integrated with a chatbot to enhance user experience.',
   'chatbot-kiosk', 3)
) as v(title, slug, descr, cat, ord)
on conflict (slug) do nothing;

-- Project tags/technologies
with p as (select id, slug from public.projects)
insert into public.project_technologies (project_id, name, display_order)
select p.id, v.tag, v.ord
from p join (values
  ('rfp-vendor-response',       'Documentation', 0),
  ('website-translation',       'Localization',  0),
  ('website-design-wordpress',  'WordPress',     0),
  ('website-design-wordpress',  'Design',        1),
  ('chatbot-kiosk',             'UI/UX',         0),
  ('chatbot-kiosk',             'Chatbot',       1)
) as v(slug, tag, ord) on v.slug = p.slug
where not exists (
  select 1 from public.project_technologies t
  where t.project_id = p.id and t.name = v.tag
);

-- Skill categories & skills ----------------------------------------------------------------------
insert into public.skill_categories (name, display_order) values
  ('Tools & Technologies', 0),
  ('Design',               1),
  ('Development',          2),
  ('AI & Productivity',    3)
on conflict (name) do nothing;

with c as (select id, name from public.skill_categories)
insert into public.skills (name, category_id, display_order, status)
select v.skill, (select id from c where c.name = v.cat), v.ord, 'published'
from (values
  ('WordPress',            'Tools & Technologies', 0),
  ('Figma',                'Design',               1),
  ('Claude',               'AI & Productivity',    2),
  ('ChatGPT',              'AI & Productivity',    3),
  ('HTML',                 'Development',          4),
  ('CSS',                  'Development',          5),
  ('JavaScript',           'Development',          6),
  ('PHP',                  'Development',          7),
  ('Website Localization', 'Tools & Technologies', 8),
  ('RFP Documentation',    'Tools & Technologies', 9),
  ('UI/UX Design',         'Design',               10),
  ('Prompt Engineering',   'AI & Productivity',    11)
) as v(skill, cat, ord)
where not exists (select 1 from public.skills s where s.name = v.skill);

-- Certificates ----------------------------------------------------------------------
insert into public.certificates (title, organization, description, display_order, status)
select 'Anthropic Academy',
       'Anthropic',
       'Completed courses to enhance AI safety, prompt engineering and responsible AI usage.',
       0, 'published'
where not exists (select 1 from public.certificates where title = 'Anthropic Academy');

-- Social links ----------------------------------------------------------------------
insert into public.social_links (platform, label, url, display_order, status)
select v.platform, v.label, v.url, v.ord, 'published'
from (values
  ('linkedin', 'LinkedIn', 'https://www.linkedin.com/', 0),
  ('github',   'GitHub',   'https://github.com/',       1),
  ('email',    'Email',    'mailto:hello@example.com',  2)
) as v(platform, label, url, ord)
where not exists (select 1 from public.social_links s where s.platform = v.platform);

-- ============================================================================
-- FINAL STEP (manual): create your admin user.
--   1. Supabase Dashboard -> Authentication -> Users -> "Add user"
--      (enter your email + a strong password, confirm email = true)
--   2. Then run:   select public.promote_admin('you@example.com');
-- ============================================================================
