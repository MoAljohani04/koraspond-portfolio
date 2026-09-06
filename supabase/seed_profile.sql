-- ============================================================================
-- Portfolio CMS - Identity + content for Mohammed Aljohani
--
-- Run this ONCE in the Supabase SQL editor to replace the original demo
-- content (Aqsa Arif / KORASpond) with the content from the Figma design.
--
-- WHAT IT TOUCHES
--   * site_settings, profile, hero, contact_settings  -> updated in place
--   * experiences + experience_items                  -> old demo row removed,
--                                                        two new roles added
--   * skill_categories + skills                       -> the 12 demo skills
--                                                        removed, 15 added
--   * project_categories + projects (+ technologies)  -> the 4 demo projects
--                                                        removed, 4 added
--
-- It deletes ONLY rows it can identify as the original demo seed, by name.
-- Anything you have added yourself is left alone. Even so: take a backup
-- (Supabase -> Database -> Backups) before running it.
--
-- Two values are intentionally left blank because they are yours to choose —
-- search for "TODO" below and fill them in before running:
--   * your public email address
--   * the address contact-form messages should be sent to
-- ============================================================================

begin;

-- ── 1. Identity (single-row tables) ─────────────────────────────────────────
update public.site_settings set
  site_title       = 'Mohammed Aljohani — Information Systems',
  meta_description = 'Portfolio of Mohammed Aljohani, Information Systems student at Taibah University — six weeks of cooperative training at KoraSpond, a digital agency.';

update public.profile set
  full_name     = 'Mohammed Aljohani',
  headline_role = 'Information Systems — Taibah University',
  about         = 'Information Systems student at Taibah University, fresh from six weeks of co-op training in a digital agency. Open to internships, graduate roles and collaborative projects.',
  email         = '',   -- TODO: your public email address
  location      = 'Al Madinah, Saudi Arabia',
  linkedin_url  = 'https://www.linkedin.com/in/mohammed-aljohani';

update public.hero set
  eyebrow           = 'Information Systems — Taibah University',
  headline          = 'I build systems — then I try to',
  highlighted_text  = 'break them.',   -- rendered in the accent italic
  description       = 'Six weeks of cooperative training at KoraSpond, a digital agency: a site-health scanner taken from database schema to live dashboard, an eleven-page bilingual brand site, and QA passes that caught what shipped in the wrong language.',
  primary_label     = 'View Work',
  primary_url       = '#work',
  primary_visible   = true,
  secondary_label   = 'Get in touch',
  secondary_url     = '#contact',
  secondary_visible = true;

update public.contact_settings set
  heading         = 'Let''s connect for opportunities.',
  description     = 'Information Systems student at Taibah University, fresh from six weeks of co-op training in a digital agency. Open to internships, graduate roles and collaborative projects.',
  public_email    = '',   -- TODO: your public email address
  recipient_email = '',   -- TODO: where contact-form messages should be sent
  success_message = 'Message received. Thank you — I''ll get back to you soon.';

-- ── 2. Social links ─────────────────────────────────────────────────────────
delete from public.social_links where url in ('https://www.linkedin.com/', 'https://github.com/', 'mailto:hello@example.com');

insert into public.social_links (platform, label, url, display_order, status) values
  ('linkedin', 'LinkedIn', 'https://www.linkedin.com/in/mohammed-aljohani', 0, 'published'),
  ('github',   'GitHub',   'https://github.com/MoAljohani04',               1, 'published');

-- ── 3. Experience ───────────────────────────────────────────────────────────
-- experience_items cascade with their experience row.
delete from public.experiences where company = 'KORASpond';

insert into public.experiences
  (company, role, department, employment_type, duration_label, description, display_order, status)
values
  ('KoraSpond', 'Co-op Trainee', 'Digital Agency', 'Cooperative Training (IS 490)',
   'Jun 21 — Jul 30, 2026 · Six weeks',
   'Cooperative training across four live projects: built a site-health scanner from schema to dashboard, developed an eleven-page bilingual brand site from Figma, ran a full manual QA audit in two languages, and delivered a content-gap analysis for an annual-report microsite. Moved between development, testing and content analysis inside the same six weeks.',
   0, 'published'),
  ('Taibah University', 'B.Sc. Information Systems', 'Supervised by Dr. Omair Bakhsh', 'Degree',
   'In progress',
   'Coursework applied directly during training: Systems Analysis & Design (requirements analysis), Database Systems (MySQL schema design), Web Engineering (front-end and back-end development), and Information Security (CSP, HSTS and X-Frame-Options inspection).',
   1, 'published');

-- "What I Worked On" cards, hung off the KoraSpond role.
with exp as (select id from public.experiences where company = 'KoraSpond' limit 1)
insert into public.experience_items (experience_id, title, description, icon, display_order, status)
select exp.id, v.title, v.descr, v.icon, v.ord, 'published'
from exp, (values
  ('Functional Analysis',   'Defined the SEO, page-speed, broken-link and security criteria for the site-health scanner before any code was written.', 'document', 0),
  ('Database Design',       'Designed the MySQL schema behind the scanner: crawl jobs, crawled pages, issues, links and security headers.',            'database', 1),
  ('API Endpoints',         'Built the endpoints that start a crawl, report its status while it runs, and return the finished results.',               'code',     2),
  ('Live Dashboard',        'Built the dashboard that polls those endpoints and updates the health score live as pages are scanned.',                 'monitor',  3),
  ('PDF & CSV Export',      'Wired up report export plus AI-written recommendations, with template-based fallbacks when no API key is configured.',    'download', 4),
  ('Front-end from Figma',  'Translated finished Figma frames into HTML, CSS and JavaScript, section by section, across eleven pages.',                'figma',    5),
  ('Bilingual Layout',      'Adjusted layouts so Arabic and English content both sat correctly without breaking the grid.',                            'globe',    6),
  ('Manual QA',             'Walked every link, button and interactive element of a live client site — twice, once fully per language.',               'check',    7),
  ('Content Gap Analysis',  'Compared a published microsite against its approved source line by line and logged every gap in a tracking sheet.',       'sparkles', 8)
) as v(title, descr, icon, ord);

-- ── 4. Skills ───────────────────────────────────────────────────────────────
-- The homepage renders one column per skill category, so the categories matter.
delete from public.skills where name in (
  'WordPress', 'Figma', 'Claude', 'ChatGPT', 'HTML', 'CSS', 'JavaScript', 'PHP',
  'Website Localization', 'RFP Documentation', 'UI/UX Design', 'Prompt Engineering'
);

insert into public.skill_categories (name, display_order) values
  ('Development', 0), ('Systems & Analysis', 1), ('Tools', 2)
on conflict (name) do nothing;

insert into public.skills (name, category_id, display_order, status)
select v.name, c.id, v.ord, 'published'
from (values
  ('PHP 8',                                'Development',        0),
  ('MySQL',                                'Development',        1),
  ('JavaScript',                           'Development',        2),
  ('HTML5',                                'Development',        3),
  ('CSS3',                                 'Development',        4),
  ('Requirements analysis',                'Systems & Analysis', 5),
  ('Relational database design',           'Systems & Analysis', 6),
  ('SEO auditing',                         'Systems & Analysis', 7),
  ('Security headers',                     'Systems & Analysis', 8),
  ('Manual QA testing',                    'Systems & Analysis', 9),
  ('Figma',                                'Tools',              10),
  ('XAMPP',                                'Tools',              11),
  ('Composer (Dompdf, Guzzle, DomCrawler)','Tools',              12),
  ('Google Gemini API',                    'Tools',              13),
  ('Microsoft Excel',                      'Tools',              14)
) as v(name, cat, ord)
join public.skill_categories c on c.name = v.cat;

-- ── 5. Projects ─────────────────────────────────────────────────────────────
-- Client names and brand assets are deliberately omitted; each project is
-- described by sector and by my own contribution.
delete from public.projects where title in (
  'RFP Vendor Response', 'Website Translation', 'Website Design (WordPress)', 'Chatbot Kiosk'
);

insert into public.project_categories (name, slug, description, icon, display_order) values
  ('Full-stack Tool',        'full-stack-tool',        'Tools built end to end, from database schema to dashboard.',   'database', 0),
  ('Front-end Development',  'front-end-development',  'Designs turned into working, responsive pages.',               'monitor',  1),
  ('Quality Assurance',      'quality-assurance',      'Manual testing passes and the defect reports that came out.',  'check',    2),
  ('Content QA & Analysis',  'content-qa-analysis',    'Published content checked, line by line, against its source.', 'document', 3)
on conflict (name) do nothing;

insert into public.projects
  (title, slug, short_description, case_study, objectives, role, duration_text, outcome,
   project_type, project_date, featured, featured_order, display_order, status)
values
  ('Website Health Monitor', 'website-health-monitor',
   'A crawler that scores any website across broken links, SEO, security headers and page speed — then explains how to fix it.',
   'The agency had no repeatable way to audit a client site before or after launch. Checks were manual, inconsistent between people, and left no record you could hand to a client. The brief was to turn that into one tool that crawls a site and returns a score you can defend.',
   E'Ran a functional analysis first — defined the SEO, page-speed, broken-link and security criteria before any code was written.\nDesigned the MySQL schema: crawl_jobs, crawled_pages, issues, links, security_headers.\nBuilt the API endpoints that start a crawl, report its status while it runs, and return the results.\nBuilt the dashboard that polls those endpoints and updates the health score live as pages are scanned.\nWired up PDF and CSV export, plus AI-written recommendations through the Gemini API — with template-based fallbacks when no API key is configured.',
   'Database design · API endpoints · Live dashboard', 'Weeks 1–3',
   'The tool returns a 0–100 health score weighted across five criteria — links 30%, SEO 25%, security 20%, speed 15%, crawl 10% — alongside an executive summary and an action plan, exportable as PDF or CSV.',
   'Full-stack Tool', '2026-07-10', true, 0, 0, 'published'),

  ('Bilingual Brand Website', 'bilingual-brand-website',
   'Eleven pages for a national fuel-station and vehicle-services brand, built from Figma and shipped in two languages.',
   'A multi-page marketing site had to be built from finished Figma designs, page by page, and hold up in both Arabic and English — where the same sentence can differ in length by a third.',
   E'Translated the Figma frames into HTML, CSS and JavaScript section by section, keeping spacing and type scale faithful to the design.\nPrepared, cropped and optimised the imagery and visual assets for every page.\nAdjusted layouts so both Arabic and English content sat correctly without breaking the grid.\nKept the build consistent with the brand identity across all eleven pages.',
   'Front-end build · Asset preparation · Bilingual layout', 'Weeks 2–4',
   'Eleven pages — Home, About, Convenience Store & Café, Car Wash, EV Charging, Express Care, Fuel Card, Station Finder, Campaigns, Press and Contact — each built to match its design and working in both languages.',
   'Front-end Development', '2026-07-05', true, 1, 1, 'published'),

  ('Bilingual QA Audit', 'bilingual-qa-audit',
   'A full manual QA pass on an automotive showcase site — run twice, once per language. That is what caught the real bug.',
   'A live client site needed a complete functional check before sign-off: every link, every button, every state — and it had to hold up in both Arabic and English.',
   E'Walked every link, button and interactive element across the whole site.\nRan the pass twice — once fully in English, once fully in Arabic — rather than spot-checking the second language.\nLogged each defect with its location, what was expected, and what actually happened.\nDelivered a structured report the development team could work straight from.',
   'Manual QA · Defect documentation', 'Week 4',
   'Testing each language as its own complete pass is what surfaced the main issue: several sections stayed in English when the interface was switched to Arabic. The language switch only reached part of the page tree, and a spot check would have missed it.',
   'Quality Assurance', '2026-07-18', true, 2, 2, 'published'),

  ('Content Gap Audit', 'content-gap-audit',
   'Comparing a published annual-report microsite against its approved source, line by line, and documenting everything missing.',
   'A live annual-report microsite had been built from an approved source deck, but nobody could say with confidence that all of it had actually made it onto the pages. The task was to prove it, page by page.',
   E'Read the approved reference content against the text actually published on each page of the live microsite.\nIdentified missing paragraphs and sentences, page by page, rather than section by section.\nLogged every gap in a tracking sheet: the page, its URL, where in the page the gap sat, and the exact text that needed to be added.\nHanded the sheet to the content team so each row could be closed and checked off directly.\nSupported business development by preparing a technical comparison of e-commerce platforms for a client proposal.',
   'Content review · Gap documentation · Proposal support', 'Weeks 5–6',
   'A single tracking sheet that turned a vague "some content is missing" into a finite, assignable list — every row locating one gap precisely enough to fix without re-reading the source.',
   'Content QA & Analysis', '2026-07-28', true, 3, 3, 'published')
on conflict (slug) do nothing;

-- Put each project in its category (this is what /work reads).
insert into public.project_category_map (project_id, category_id)
select p.id, c.id
from public.projects p
join public.project_categories c on c.name = p.project_type
where p.slug in ('website-health-monitor', 'bilingual-brand-website', 'bilingual-qa-audit', 'content-gap-audit')
on conflict do nothing;

-- Tools & technologies per project.
insert into public.project_technologies (project_id, name, display_order)
select p.id, v.name, v.ord
from (values
  ('website-health-monitor', 'PHP 8',                   0),
  ('website-health-monitor', 'MySQL',                   1),
  ('website-health-monitor', 'JavaScript',              2),
  ('website-health-monitor', 'Dompdf',                  3),
  ('website-health-monitor', 'Guzzle',                  4),
  ('website-health-monitor', 'Symfony DomCrawler',      5),
  ('website-health-monitor', 'Google Gemini API',       6),
  ('website-health-monitor', 'XAMPP',                   7),
  ('bilingual-brand-website', 'HTML5',                  0),
  ('bilingual-brand-website', 'CSS3',                   1),
  ('bilingual-brand-website', 'JavaScript',             2),
  ('bilingual-brand-website', 'Figma',                  3),
  ('bilingual-qa-audit', 'Manual QA',                   0),
  ('bilingual-qa-audit', 'Microsoft Excel',             1),
  ('bilingual-qa-audit', 'Browser DevTools',            2),
  ('content-gap-audit', 'Microsoft Excel',              0),
  ('content-gap-audit', 'Microsoft PowerPoint',         1),
  ('content-gap-audit', 'Manual review',                2)
) as v(slug, name, ord)
join public.projects p on p.slug = v.slug;

commit;

-- ── After running ───────────────────────────────────────────────────────────
-- Open admin.html and check Profile, Hero, Experience, Skills and Projects.
-- Projects with no cover image are drawn as generated SVG diagrams, which is
-- how the design intends them — upload a cover only where you have a real one.
