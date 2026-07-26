// Built-in demo content. Shown on the public site only while Supabase is not
// configured yet, so you can preview the design immediately. Once your keys
// are in config.js, everything comes from the database instead.

export const FALLBACK = {
  settings: {
    site_title: "Aqsa Arif — Co-op Intern | Technology",
    meta_description:
      "Portfolio of Aqsa Arif, Co-op Intern at KORASpond — turning ideas into impactful solutions.",
  },
  profile: {
    full_name: "Aqsa Arif",
    headline_role: "Co-op Intern | Technology",
    about:
      "Co-op Intern at KORASpond — 1.5 months of learning, building, and contributing to real-world projects.",
    email: "hello@example.com",
    phone: null,
    location: null,
    linkedin_url: "https://www.linkedin.com/",
    cv_url: null,
    avatar_url: null,
  },
  hero: {
    eyebrow: "PORTFOLIO",
    headline: "Turning Ideas into",
    highlighted_text: "Impactful Solutions.",
    description:
      "Co-op Intern at KORASpond — 1.5 months of learning, building, and contributing to real-world projects.",
    primary_label: "View My Work",
    primary_url: "#projects",
    primary_visible: true,
    secondary_label: "Contact Me",
    secondary_url: "#contact",
    secondary_visible: true,
    background_image: null,
  },
  experiences: [
    {
      id: "exp-koraspond",
      company: "KORASpond",
      role: "Co-op Intern",
      department: "Technology Department",
      employment_type: "Co-op Internship",
      duration_label: "1.5 Months",
      logo_url: null,
      description:
        "During my internship, I worked on diverse projects and tasks that strengthened my technical, design, and problem-solving skills.",
      items: [
        { title: "RFP Vendor Responses", description: "Prepared RFP vendor responses for multiple clients with clear, structured and professional content.", icon: "document" },
        { title: "Website Translation", description: "Translated websites to support multi-language accessibility using professional localization practices.", icon: "globe" },
        { title: "Website Design", description: "Designed responsive and modern websites that are user-friendly and aligned with client needs.", icon: "monitor" },
        { title: "Using WordPress", description: "Built and customized websites using WordPress including themes, plugins and page builders.", icon: "wordpress" },
        { title: "Figma Design", description: "Created UI/UX designs, wireframes and prototypes using Figma.", icon: "figma" },
        { title: "AI Tools", description: "Leveraged Claude and ChatGPT AI tools to improve productivity, generate content and solve problems.", icon: "brain" },
        { title: "Chatbot Kiosk", description: "Designed a kiosk interface integrated with a chatbot for better user interaction and assistance.", icon: "chat" },
        { title: "Website Health Crawler", description: "Built a website to crawl other websites and monitor their health, status and performance.", icon: "pulse" },
        { title: "Anthropic Academy", description: "Completed courses from Anthropic Academy on AI safety, prompt engineering and responsible AI usage.", icon: "sparkles" },
      ],
    },
  ],
  projects: [
    { title: "RFP Vendor Response", short_description: "Created comprehensive RFP responses for various clients addressing technical and business requirements.", technologies: ["Documentation"], cover_image: null, project_url: null },
    { title: "Website Translation", short_description: "Translated and localized websites to reach global audiences and improve accessibility.", technologies: ["Localization"], cover_image: null, project_url: null },
    { title: "Website Design (WordPress)", short_description: "Designed and developed responsive websites using WordPress with custom themes and plugins.", technologies: ["WordPress", "Design"], cover_image: null, project_url: null },
    { title: "Chatbot Kiosk", short_description: "Designed an interactive kiosk integrated with a chatbot to enhance user experience.", technologies: ["UI/UX", "Chatbot"], cover_image: null, project_url: null },
  ],
  skills: [
    "WordPress", "Figma", "Claude", "ChatGPT", "HTML", "CSS", "JavaScript",
    "PHP", "Website Localization", "RFP Documentation", "UI/UX Design",
    "Prompt Engineering",
  ].map((name) => ({ name, icon_url: null })),
  certificates: [
    {
      title: "Anthropic Academy",
      organization: "Anthropic",
      issue_date: null,
      description: "Completed courses to enhance AI safety, prompt engineering and responsible AI usage.",
      image_url: null,
      verify_url: null,
      file_url: null,
    },
  ],
  socialLinks: [
    { platform: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/" },
    { platform: "github", label: "GitHub", url: "https://github.com/" },
    { platform: "email", label: "Email", url: "mailto:hello@example.com" },
  ],
  contact: {
    heading: "Let's connect and build something great together.",
    description: "Thank you for visiting my portfolio! Send me a message and I'll get back to you.",
    public_email: "hello@example.com",
    success_message: "Thanks! Your message has been sent.",
    error_message: "Something went wrong. Please try again.",
  },
};
