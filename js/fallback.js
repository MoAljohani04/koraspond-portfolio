// Built-in demo content. Shown on the public site only while Supabase is not
// configured yet, so you can preview the design immediately. Once your keys
// are in config.js, everything comes from the database instead.
//
// This mirrors the content in the Figma design so the demo and the live site
// describe the same person. To change the live site, edit it in the admin
// dashboard (or run supabase/seed_profile.sql once) — not here.

export const FALLBACK = {
  settings: {
    site_title: "Mohammed Aljohani — Information Systems",
    meta_description:
      "Portfolio of Mohammed Aljohani, Information Systems student at Taibah University — six weeks of cooperative training at KoraSpond, a digital agency.",
  },
  profile: {
    full_name: "Mohammed Aljohani",
    headline_role: "Information Systems — Taibah University",
    about:
      "Information Systems student at Taibah University, fresh from six weeks of co-op training in a digital agency. Open to internships, graduate roles and collaborative projects.",
    email: "",              // ← your public email address
    phone: null,
    location: "Al Madinah, Saudi Arabia",
    linkedin_url: "https://www.linkedin.com/in/mohammed-aljohani",
    cv_url: null,
    avatar_url: null,
  },
  hero: {
    eyebrow: "Information Systems — Taibah University",
    headline: "I build systems — then I try to",
    highlighted_text: "break them.",
    description:
      "Six weeks of cooperative training at KoraSpond, a digital agency: a site-health scanner taken from database schema to live dashboard, an eleven-page bilingual brand site, and QA passes that caught what shipped in the wrong language.",
    primary_label: "View Work",
    primary_url: "#work",
    primary_visible: true,
    secondary_label: "Get in touch",
    secondary_url: "#contact",
    secondary_visible: true,
    background_image: null,
  },
  experiences: [
    {
      id: "exp-koraspond",
      company: "KoraSpond",
      role: "Co-op Trainee",
      department: "Digital Agency",
      employment_type: "Cooperative Training (IS 490)",
      duration_label: "Jun 21 — Jul 30, 2026 · Six weeks",
      logo_url: null,
      description:
        "Cooperative training across four live projects: built a site-health scanner from schema to dashboard, developed an eleven-page bilingual brand site from Figma, ran a full manual QA audit in two languages, and delivered a content-gap analysis for an annual-report microsite. Moved between development, testing and content analysis inside the same six weeks.",
      items: [
        { title: "Functional Analysis", description: "Defined the SEO, page-speed, broken-link and security criteria for the site-health scanner before any code was written.", icon: "document" },
        { title: "Database Design", description: "Designed the MySQL schema behind the scanner: crawl jobs, crawled pages, issues, links and security headers.", icon: "database" },
        { title: "API Endpoints", description: "Built the endpoints that start a crawl, report its status while it runs, and return the finished results.", icon: "code" },
        { title: "Live Dashboard", description: "Built the dashboard that polls those endpoints and updates the health score live as pages are scanned.", icon: "monitor" },
        { title: "PDF & CSV Export", description: "Wired up report export plus AI-written recommendations, with template-based fallbacks when no API key is configured.", icon: "download" },
        { title: "Front-end from Figma", description: "Translated finished Figma frames into HTML, CSS and JavaScript, section by section, across eleven pages.", icon: "figma" },
        { title: "Bilingual Layout", description: "Adjusted layouts so Arabic and English content both sat correctly without breaking the grid.", icon: "globe" },
        { title: "Manual QA", description: "Walked every link, button and interactive element of a live client site — twice, once fully per language.", icon: "check" },
        { title: "Content Gap Analysis", description: "Compared a published microsite against its approved source line by line and logged every gap in a tracking sheet.", icon: "sparkles" },
      ],
    },
    {
      id: "exp-taibah",
      company: "Taibah University",
      role: "B.Sc. Information Systems",
      department: "Supervised by Dr. Omair Bakhsh",
      employment_type: "Degree",
      duration_label: "In progress",
      logo_url: null,
      description:
        "Coursework applied directly during training: Systems Analysis & Design (requirements analysis), Database Systems (MySQL schema design), Web Engineering (front-end and back-end development), and Information Security (CSP, HSTS and X-Frame-Options inspection).",
      items: [],
    },
  ],
  projects: [
    {
      title: "Website Health Monitor",
      slug: "website-health-monitor",
      short_description:
        "A crawler that scores any website across broken links, SEO, security headers and page speed — then explains how to fix it.",
      project_type: "Full-stack Tool",
      project_date: "2026-07-10",
      technologies: ["PHP 8", "MySQL", "JavaScript", "Dompdf", "Guzzle", "Symfony DomCrawler", "Gemini API"],
      cover_image: null,
      project_url: null,
    },
    {
      title: "Bilingual Brand Website",
      slug: "bilingual-brand-website",
      short_description:
        "Eleven pages for a national fuel-station and vehicle-services brand, built from Figma and shipped in two languages.",
      project_type: "Front-end Development",
      project_date: "2026-07-05",
      technologies: ["HTML5", "CSS3", "JavaScript", "Figma"],
      cover_image: null,
      project_url: null,
    },
    {
      title: "Bilingual QA Audit",
      slug: "bilingual-qa-audit",
      short_description:
        "A full manual QA pass on an automotive showcase site — run twice, once per language. That is what caught the real bug.",
      project_type: "Quality Assurance",
      project_date: "2026-07-18",
      technologies: ["Manual QA", "Microsoft Excel", "Browser DevTools"],
      cover_image: null,
      project_url: null,
    },
    {
      title: "Content Gap Audit",
      slug: "content-gap-audit",
      short_description:
        "Comparing a published annual-report microsite against its approved source, line by line, and documenting everything missing.",
      project_type: "Content QA & Analysis",
      project_date: "2026-07-28",
      technologies: ["Microsoft Excel", "Microsoft PowerPoint", "Manual review"],
      cover_image: null,
      project_url: null,
    },
  ],
  skillCategories: [
    { id: "sc-dev", name: "Development", display_order: 1 },
    { id: "sc-sys", name: "Systems & Analysis", display_order: 2 },
    { id: "sc-tools", name: "Tools", display_order: 3 },
  ],
  skills: [
    ...["PHP 8", "MySQL", "JavaScript", "HTML5", "CSS3"].map((name) => ({ name, category_id: "sc-dev", icon_url: null })),
    ...["Requirements analysis", "Relational database design", "SEO auditing", "Security headers", "Manual QA testing"]
      .map((name) => ({ name, category_id: "sc-sys", icon_url: null })),
    ...["Figma", "XAMPP", "Composer (Dompdf, Guzzle, DomCrawler)", "Google Gemini API", "Microsoft Excel"]
      .map((name) => ({ name, category_id: "sc-tools", icon_url: null })),
  ],
  certificates: [],
  socialLinks: [
    { platform: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/mohammed-aljohani" },
    { platform: "github", label: "GitHub", url: "https://github.com/MoAljohani04" },
  ],
  contact: {
    heading: "Let's connect for opportunities.",
    description:
      "Information Systems student at Taibah University, fresh from six weeks of co-op training in a digital agency. Open to internships, graduate roles and collaborative projects.",
    public_email: "",       // ← your public email address
    success_message: "Message received. Thank you — I'll get back to you soon.",
    error_message: "Something went wrong. Please try again.",
  },
};
