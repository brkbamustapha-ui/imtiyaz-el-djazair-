/**
 * Seed script — safe to run repeatedly.
 *
 *   npm run db:seed
 *
 * It creates:
 *   1. the initial SUPER_ADMIN from ADMIN_EMAIL / ADMIN_PASSWORD in .env
 *   2. site settings, menus and pages
 *   3. DEMO CONTENT (only when SEED_DEMO_CONTENT=true)
 *
 * Everything marked `TODO(client)` below is placeholder content that the school
 * should replace from /admin. No real third-party logo is bundled: the files in
 * public/assets/partners are typographic placeholders.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { DEFAULT_SETTINGS } from "../src/lib/settings-schema";
import { defaultsForType } from "../src/lib/section-types";
import { DEFAULT_CONTACT_FIELDS } from "../src/lib/forms";

const db = new PrismaClient();
const scrypt = promisify(scryptCb) as (p: string, s: Buffer, k: number) => Promise<Buffer>;

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

const json = (value: unknown) => JSON.stringify(value ?? {});
const demoEnabled = process.env.SEED_DEMO_CONTENT !== "false";

async function seedSuperAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME || "Site Owner";

  if (!email) {
    console.warn("⚠  ADMIN_EMAIL is not set — no Super Admin was created.");
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "SUPER_ADMIN") {
      await db.user.update({ where: { id: existing.id }, data: { role: "SUPER_ADMIN" } });
    }
    console.log(`✓ Super Admin already exists: ${email}`);
    return;
  }

  if (!password) {
    console.warn(
      "⚠  ADMIN_PASSWORD is empty — set it in .env and re-run `npm run db:seed` to create the owner account.",
    );
    return;
  }
  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters long.");
  }

  await db.user.create({
    data: {
      email,
      name,
      role: "SUPER_ADMIN",
      passwordHash: await hashPassword(password),
      isActive: true,
      // Force a password change on first login so the .env value is never the
      // long-lived credential.
      mustChangePassword: true,
    },
  });
  console.log(`✓ Super Admin created: ${email} (you must change the password at first login)`);
}

/**
 * Clears stored logo/favicon/share-image paths that no longer point at a real
 * file, so the site falls back to plain text instead of a broken image.
 * Runs on every seed, which makes upgrades from an older build self-healing.
 */
async function normaliseBrandPaths() {
  const row = await db.siteSetting.findUnique({ where: { key: "general" } });
  if (!row) return;

  const value = JSON.parse(row.valueJson) as Record<string, unknown>;
  const fields = ["logoUrl", "logoDarkUrl", "faviconUrl", "ogImageUrl"];
  let changed = false;

  for (const field of fields) {
    const url = typeof value[field] === "string" ? (value[field] as string) : "";
    if (url === "") continue;

    // Runtime media lives outside /public and is checked on disk directly.
    const onDisk = url.startsWith("/media/")
      ? path.join(process.cwd(), "storage", "media", url.slice("/media/".length))
      : path.join(process.cwd(), "public", url);

    if (!existsSync(onDisk)) {
      value[field] = "";
      changed = true;
    }
  }

  if (changed) {
    await db.siteSetting.update({
      where: { key: "general" },
      data: { valueJson: JSON.stringify(value) },
    });
    console.log("✓ Cleared logo/share-image paths that pointed at missing files");
  }
}

/**
 * Fill in a setting only where it is still empty.
 *
 * seedSettings() skips any key that already exists, so an install created
 * before these links were known would never pick them up. This backfills the
 * school's own accounts and map pin into the blanks and touches nothing else —
 * a value the owner has already typed always wins.
 */
async function backfillContactLinks() {
  const wanted: Record<string, Record<string, string>> = {
    contact: { mapsLink: DEFAULT_SETTINGS.contact.mapsLink },
    social: {
      instagram: DEFAULT_SETTINGS.social.instagram,
      tiktok: DEFAULT_SETTINGS.social.tiktok,
    },
  };

  const filled: string[] = [];
  for (const [key, fields] of Object.entries(wanted)) {
    const row = await db.siteSetting.findUnique({ where: { key } });
    if (!row) continue;
    const value = JSON.parse(row.valueJson) as Record<string, unknown>;
    let changed = false;
    for (const [field, url] of Object.entries(fields)) {
      if (!url) continue;
      if (typeof value[field] === "string" && (value[field] as string).trim() !== "") continue;
      value[field] = url;
      changed = true;
      filled.push(`${key}.${field}`);
    }
    if (changed) {
      await db.siteSetting.update({ where: { key }, data: { valueJson: JSON.stringify(value) } });
    }
  }

  if (filled.length > 0) console.log(`✓ Filled empty contact links: ${filled.join(", ")}`);
}

/**
 * Drop social networks that are no longer offered.
 *
 * Settings are read as `{ ...defaults, ...stored }`, so a key left behind in an
 * older row survives the merge even after it is gone from the schema. Nothing
 * renders it any more, but leaving a stale URL sitting in the database is how a
 * removed account quietly comes back. Only fields absent from the current
 * schema are removed; everything the schema still knows about is untouched.
 */
async function pruneRemovedSocialFields() {
  const row = await db.siteSetting.findUnique({ where: { key: "social" } });
  if (!row) return;

  const stored = JSON.parse(row.valueJson) as Record<string, unknown>;
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS.social));
  const stale = Object.keys(stored).filter((field) => !allowed.has(field));
  if (stale.length === 0) return;

  for (const field of stale) delete stored[field];
  await db.siteSetting.update({
    where: { key: "social" },
    data: { valueJson: JSON.stringify(stored) },
  });
  console.log(`✓ Removed social networks no longer offered: ${stale.join(", ")}`);
}

async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db.siteSetting.findUnique({ where: { key } });
    if (existing) continue;
    await db.siteSetting.create({ data: { key, valueJson: json(value) } });
  }
  console.log("✓ Settings initialised");
}

// Menu labels are stored as localized JSON so the header translates with the site.
const HEADER_MENU = [
  { label: { en: "Home", fr: "Accueil", ar: "الرئيسية" }, href: "/" },
  { label: { en: "About", fr: "À propos", ar: "من نحن" }, href: "/about" },
  { label: { en: "Programs", fr: "Programmes", ar: "البرامج" }, href: "/programs" },
  { label: { en: "IELTS", fr: "IELTS", ar: "آيلتس" }, href: "/ielts" },
  { label: { en: "Exam Center", fr: "Centre d'examen", ar: "مركز الامتحانات" }, href: "/exam-center" },
  { label: { en: "News", fr: "Actualités", ar: "الأخبار" }, href: "/news" },
  { label: { en: "Contact", fr: "Contact", ar: "اتصل بنا" }, href: "/contact" },
];

async function seedMenu() {
  if ((await db.menuItem.count({ where: { menuKey: "header" } })) > 0) return;
  await db.menuItem.createMany({
    data: HEADER_MENU.map((item, index) => ({
      menuKey: "header",
      label: json(item.label),
      href: item.href,
      order: index,
      isActive: true,
    })),
  });
  console.log("✓ Header menu created");
}

type PageSpec = {
  slug: string;
  title: string;
  isSystem?: boolean;
  seo?: Record<string, unknown>;
  sections: { type: string; name: string; overrides?: Record<string, unknown> }[];
};

const PAGES: PageSpec[] = [
  {
    slug: "home",
    title: "Home",
    isSystem: true,
    seo: {
      title: "Imtiyaz El Djazair — School & Exam Center",
      description:
        "School and exam centre in Algeria: English courses, IELTS preparation, academic support and international opportunities.",
    },
    sections: [
      { type: "hero", name: "Hero" },
      { type: "partners", name: "Partners & Accreditations", overrides: { layout: "cards" } },
      {
        type: "about",
        name: "About the school",
        overrides: { image: "/assets/photos/reception-01.webp" },
      },
      {
        type: "videoGallery",
        name: "Inside the school",
        overrides: {
                "eyebrow": {
                          "en": "Inside the school",
                          "fr": "Dans l'école",
                          "ar": "داخل المدرسة"
                },
                "title": {
                          "en": "See where you will study",
                          "fr": "Découvrez où vous étudierez",
                          "ar": "شاهد أين ستدرس"
                },
                "subtitle": {
                          "en": "Our classrooms and a lesson in progress, filmed on campus — so you know what to expect before you walk in.",
                          "fr": "Nos salles de cours et un cours en session, filmés sur place — pour savoir à quoi vous attendre avant même d'entrer.",
                          "ar": "قاعاتنا وحصة جارية، مصوّرة في المقر — لتعرف ما ينتظرك قبل أن تدخل."
                },
                "body": {
                          "en": "",
                          "fr": "",
                          "ar": ""
                },
                "videos": [
                          {
                                    "title": {
                                              "en": "An English class in session",
                                              "fr": "Un cours d'anglais en session",
                                              "ar": "حصة إنجليزية جارية"
                                    },
                                    "src": "/assets/video/school-01.mp4",
                                    "poster": "/assets/video/posters/school-01.webp"
                          },
                          {
                                    "title": {
                                              "en": "Our main teaching room",
                                              "fr": "Notre grande salle de cours",
                                              "ar": "قاعتنا الرئيسية"
                                    },
                                    "src": "/assets/video/school-02.mp4",
                                    "poster": "/assets/video/posters/school-02.webp"
                          },
                          {
                                    "title": {
                                              "en": "Seminar room",
                                              "fr": "Salle de séminaire",
                                              "ar": "قاعة الندوات"
                                    },
                                    "src": "/assets/video/school-03.mp4",
                                    "poster": "/assets/video/posters/school-03.webp"
                          }
                ],
                "columns": "3",
                "tone": "surface",
                "primaryCta": [
                          {
                                    "label": {
                                              "en": "Visit the campus",
                                              "fr": "Visiter le campus",
                                              "ar": "زيارة المقر"
                                    },
                                    "href": "/contact"
                          }
                ]
      },
      },
      { type: "services", name: "What we offer" },
      { type: "ielts", name: "IELTS journey" },
      { type: "stats", name: "Key figures" },
      {
        type: "examCenter",
        name: "Exam Center",
        overrides: { image: "/assets/photos/exam-room-02.webp" },
      },
      { type: "valueCards", name: "Mission, vision, approach" },
      { type: "gallery", name: "Campus gallery", overrides: { limit: 24 } },
      { type: "videoGallery", name: "Summer Camp", overrides: { tone: "default" } },
      { type: "testimonials", name: "Student testimonials" },
      { type: "news", name: "Latest news" },
      { type: "faq", name: "FAQ" },
      { type: "cta", name: "Closing call to action" },
      { type: "contact", name: "Contact" },
    ],
  },
  {
    slug: "about",
    title: "About",
    sections: [
      {
        type: "about",
        name: "Introduction",
        overrides: {
          eyebrow: { en: "About us", fr: "À propos", ar: "من نحن" },
          title: {
            en: "Imtiyaz El Djazair",
            fr: "Imtiyaz El Djazair",
            ar: "امتياز الجزائر",
          },
        },
      },
      { type: "valueCards", name: "Mission, vision, approach" },
      { type: "featureGrid", name: "Why choose us" },
      { type: "stats", name: "Key figures" },
      { type: "testimonials", name: "Testimonials" },
      { type: "cta", name: "Call to action" },
    ],
  },
  {
    slug: "programs",
    title: "Programs",
    sections: [
      {
        type: "services",
        name: "All programs",
        overrides: {
          eyebrow: { en: "Programs", fr: "Programmes", ar: "البرامج" },
          title: {
            en: "Courses and preparation programmes",
            fr: "Cours et programmes de préparation",
            ar: "الدورات وبرامج التحضير",
          },
          limit: 12,
        },
      },
      { type: "steps", name: "How it works" },
      { type: "faq", name: "FAQ" },
      { type: "cta", name: "Call to action" },
    ],
  },
  {
    slug: "ielts",
    title: "IELTS",
    seo: {
      title: "IELTS Preparation in Algeria",
      description:
        "Structured IELTS preparation across Listening, Reading, Writing and Speaking, with mock tests in real exam conditions.",
    },
    sections: [
      { type: "ielts", name: "IELTS journey" },
      { type: "steps", name: "From first contact to results" },
      {
        type: "examCenter",
        name: "Exam Center",
        overrides: { image: "/assets/photos/exam-room-02.webp" },
      },
      { type: "testimonials", name: "Testimonials" },
      { type: "faq", name: "FAQ" },
      { type: "cta", name: "Call to action" },
    ],
  },
  {
    slug: "exam-center",
    title: "Exam Center",
    sections: [
      {
        type: "examCenter",
        name: "Exam Center",
        overrides: { image: "/assets/photos/exam-room-02.webp" },
      },
      { type: "featureGrid", name: "On the day" },
      { type: "gallery", name: "Facilities" },
      { type: "faq", name: "FAQ" },
      { type: "contact", name: "Contact" },
    ],
  },
  {
    slug: "gallery",
    title: "Campus",
    sections: [
      {
        type: "gallery",
        name: "Full gallery",
        overrides: { limit: 40 },
      },
      { type: "cta", name: "Call to action" },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    sections: [{ type: "contact", name: "Contact" }],
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    sections: [
      {
        type: "richText",
        name: "Privacy policy",
        overrides: {
          title: { en: "Privacy Policy", fr: "Politique de confidentialité", ar: "سياسة الخصوصية" },
          body: {
            // TODO(client): replace with a policy reviewed for your jurisdiction.
            en: "<p><strong>This is a placeholder policy.</strong> Replace it from Admin → Pages → Privacy Policy with text reviewed for your jurisdiction.</p><h2>What we collect</h2><p>When you send us a message we store the details you type into the form (name, email, phone, subject and message) so that we can reply. We also count anonymous page views to understand which pages are useful.</p><h2>What we do not do</h2><p>We do not sell your data and we do not share it with advertisers.</p><h2>Contact</h2><p>To ask what we hold about you, or to have it deleted, write to the email address on our contact page.</p>",
            fr: "<p><strong>Ceci est un texte provisoire.</strong> Remplacez-le depuis Admin → Pages → Politique de confidentialité.</p><h2>Données collectées</h2><p>Lorsque vous nous écrivez, nous conservons les informations saisies dans le formulaire afin de pouvoir vous répondre. Nous comptons également des vues de pages anonymes.</p><h2>Ce que nous ne faisons pas</h2><p>Nous ne vendons pas vos données et ne les partageons pas avec des annonceurs.</p>",
            ar: "<p><strong>هذا نص مؤقت.</strong> استبدله من لوحة التحكم.</p>",
          },
        },
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    sections: [
      {
        type: "richText",
        name: "Terms",
        overrides: {
          title: { en: "Terms & Conditions", fr: "Conditions générales", ar: "الشروط والأحكام" },
          body: {
            // TODO(client): replace with your own terms.
            en: "<p><strong>This is a placeholder.</strong> Replace it from Admin → Pages → Terms &amp; Conditions.</p><h2>Enrolment</h2><p>Describe how a student enrols, what a place costs and when payment is due.</p><h2>Cancellation</h2><p>Describe your refund and cancellation rules.</p><h2>Examinations</h2><p>Examination registration, identification requirements and results are governed by the rules of the awarding body for that examination.</p>",
            fr: "<p><strong>Texte provisoire.</strong> Remplacez-le depuis Admin → Pages → Conditions générales.</p>",
            ar: "<p><strong>نص مؤقت.</strong> استبدله من لوحة التحكم.</p>",
          },
        },
      },
    ],
  },
];

async function seedPages() {
  for (const [pageIndex, spec] of PAGES.entries()) {
    const existing = await db.page.findUnique({ where: { slug: spec.slug } });
    if (existing) continue;

    const page = await db.page.create({
      data: {
        slug: spec.slug,
        title: spec.title,
        isPublished: true,
        isSystem: spec.isSystem ?? false,
        order: pageIndex,
        seoJson: json(spec.seo ?? {}),
      },
    });

    for (const [index, section] of spec.sections.entries()) {
      await db.section.create({
        data: {
          pageId: page.id,
          type: section.type,
          name: section.name,
          order: index,
          isEnabled: true,
          dataJson: json({ ...defaultsForType(section.type), ...(section.overrides ?? {}) }),
        },
      });
    }
  }
  console.log(`✓ ${PAGES.length} pages ensured`);
}

async function seedForms() {
  const existing = await db.form.findUnique({ where: { slug: "contact" } });
  if (existing) return;
  await db.form.create({
    data: {
      slug: "contact",
      name: "Contact form",
      fieldsJson: json(DEFAULT_CONTACT_FIELDS),
      successMessage:
        "Thank you — your message has reached us. We usually reply within one working day.",
      isActive: true,
    },
  });
  console.log("✓ Contact form created");
}

/* ------------------------------ DEMO CONTENT ------------------------------ */
/* Everything below is illustrative. Replace it from /admin before go-live.   */

// Logo files are the official artwork supplied by the school (see
// public/assets/source for the originals). Descriptions start empty on
// purpose: the admin shows guidance about confirming each relationship
// before publishing claims about it.
const PARTNERS = [
  {
    name: "British Council",
    logoUrl: "/assets/partners/british-council.png",
    type: "PARTNER",
    description: "",
    website: "",
  },
  {
    name: "IELTS",
    logoUrl: "/assets/partners/ielts.png",
    type: "CERTIFICATION",
    description: "",
    website: "",
  },
  {
    name: "Manchester City Football School",
    logoUrl: "/assets/partners/manchester-city.png",
    type: "SPONSOR",
    description: "",
    website: "",
  },
  {
    name: "BSC Education",
    logoUrl: "/assets/partners/bsc-education.png",
    type: "PARTNER",
    description: "",
    website: "",
  },
  {
    name: "TOLES Legal",
    logoUrl: "/assets/partners/toles.png",
    type: "CERTIFICATION",
    description: "",
    website: "",
  },
];

const SERVICES = [
  {
    title: "School",
    description:
      "Structured English programmes for teenagers and adults, from A1 to C1, with a placement test before you enrol.",
    icon: "graduation",
    href: "/programs",
  },
  {
    title: "IELTS Preparation",
    description:
      "Targeted preparation across all four skills, corrected against the official band descriptors.",
    icon: "target",
    href: "/ielts",
  },
  {
    title: "Exam Center",
    description:
      "Controlled test rooms, trained invigilators and a candidate briefing before every session.",
    icon: "building",
    href: "/exam-center",
  },
  {
    title: "English Courses",
    description:
      "General, business and conversation English in small groups, mornings, evenings and weekends.",
    icon: "book",
    href: "/programs",
  },
  {
    title: "Academic Support",
    description:
      "One-to-one follow-up: a study plan, weekly checkpoints and a written progress report.",
    icon: "users",
    href: "/programs",
  },
  {
    title: "International Opportunities",
    description:
      "Guidance on university applications, language requirements and the documents each country asks for.",
    icon: "globe",
    href: "/contact",
  },
];

const STATS = [
  { label: "Experienced teachers", value: 18, suffix: "+", icon: "users" },
  { label: "Students taught", value: 2400, suffix: "+", icon: "graduation" },
  { label: "Courses & programmes", value: 12, suffix: "", icon: "book" },
  { label: "Years of excellence", value: 10, suffix: "+", icon: "award" },
];

const TESTIMONIALS = [
  {
    name: "Amina B.",
    program: "IELTS Academic — Band 7.5",
    quote:
      "The mock tests were the difference. By the time I sat the real exam I already knew the room, the timing and my own weak points.",
    rating: 5,
  },
  {
    name: "Yacine M.",
    program: "IELTS General — Band 7.0",
    quote:
      "My writing was stuck at 5.5 for months. Two corrected essays a week, each with exactly two things to fix, moved me to 7.",
    rating: 5,
  },
  {
    name: "Sara K.",
    program: "General English B2",
    quote:
      "Small groups mean you actually speak. I went from avoiding conversation to presenting in front of the class.",
    rating: 5,
  },
  {
    name: "Bilal H.",
    program: "Business English",
    quote:
      "Practical and specific — emails, calls and meetings, not textbook dialogues. I use it every day at work.",
    rating: 4,
  },
  {
    name: "Nour E.",
    program: "IELTS Academic — Band 8.0",
    quote:
      "The speaking mocks were harder than the exam itself, which is exactly what you want.",
    rating: 5,
  },
  {
    name: "Karim D.",
    program: "Academic support",
    quote:
      "A clear plan with weekly checkpoints. For the first time I could see progress instead of guessing at it.",
    rating: 5,
  },
];

const FAQ = [
  {
    question: "How do I know which level to start at?",
    answer:
      "Every new student takes a short written and spoken placement assessment. It takes about 40 minutes and we discuss the result with you the same week.",
  },
  {
    question: "How long does it take to reach the IELTS band I need?",
    answer:
      "It depends on your starting band and how much you study between classes. As a guide, moving up half a band typically takes 8 to 12 weeks of consistent work.",
  },
  {
    question: "Do you run mock tests under real exam conditions?",
    answer:
      "Yes. Full-length mock tests are sat in our exam rooms with the same timing and the same rules as the real session, and are marked against the official descriptors.",
  },
  {
    question: "What are the class sizes?",
    answer:
      "Preparation groups are deliberately small so that every student speaks in every session and written work can be corrected individually.",
  },
  {
    question: "Can I study in the evening or at the weekend?",
    answer:
      "Yes — we run morning, evening and weekend groups. Tell us your availability when you enrol and we will place you in the group that fits.",
  },
  {
    question: "Do you help with university applications?",
    answer:
      "We advise on the language requirements and the documents each destination asks for. We are not an immigration agency and we do not process visas.",
  },
  {
    question: "How do I register for an examination?",
    answer:
      "Contact us and we will walk you through the registration steps, the identification you must bring, and the available session dates.",
  },
  {
    question: "What should I bring on test day?",
    answer:
      "The identification document you registered with, and nothing else in the test room. Everything else is stored for you at reception.",
  },
];

const POSTS = [
  {
    slug: "new-ielts-preparation-intake",
    type: "NEWS",
    title: "New IELTS preparation intake opens this month",
    excerpt:
      "A new eight-week intensive group starts this month, with morning and evening options and a placement assessment in the first week.",
    category: "Admissions",
    coverUrl: "/assets/gallery/cover-01.webp",
    content:
      "<p>A new eight-week IELTS preparation group opens this month. The programme covers all four skills, with two corrected writing tasks each week and a full mock test in week six.</p><h2>What is included</h2><ul><li>Placement assessment and a target band agreed in week one</li><li>Weekly corrected writing with band-descriptor feedback</li><li>One-to-one speaking mocks from week three</li><li>A full mock test under exam conditions in week six</li></ul><p>Places are limited so that every student speaks in every session. Contact us to book your placement assessment.</p><p><em>TODO(client): replace this demo article with your real announcement.</em></p>",
  },
  {
    slug: "inside-our-exam-rooms",
    type: "NEWS",
    title: "Inside our exam rooms: what test day actually looks like",
    excerpt:
      "A walkthrough of the arrival process, identification checks, the waiting area and the test room itself.",
    category: "Exam Center",
    coverUrl: "/assets/gallery/cover-02.webp",
    content:
      "<p>Most of the stress on test day comes from not knowing what happens next. Here is the whole sequence, in order.</p><h2>Arrival</h2><p>Come early. You will be checked in at reception, your identification is verified against your registration, and personal items are stored.</p><h2>Briefing</h2><p>Before anyone enters the test room, an invigilator explains the timing, the rules and what to do if you have a problem during the paper.</p><h2>The test room</h2><p>Individual desks, a visible clock and a controlled entrance. Nothing on the desk except what the paper allows.</p><p><em>TODO(client): replace with your own article and photographs.</em></p>",
  },
  {
    slug: "how-to-move-from-band-6-to-band-7-in-writing",
    type: "NEWS",
    title: "How to move from Band 6 to Band 7 in Writing",
    excerpt:
      "The three things that most often separate a 6 from a 7 — and the exercises we use to fix each one.",
    category: "IELTS",
    coverUrl: "/assets/gallery/cover-03.webp",
    content:
      "<p>Writing is the skill students get stuck on longest. In our experience three things separate a 6 from a 7.</p><h2>1. Answering the whole question</h2><p>A Band 6 answer often covers half the task. Underline every part of the prompt before you start and check them off at the end.</p><h2>2. Paragraph shape</h2><p>One idea per paragraph, stated in the first sentence, then supported. Examiners should never have to hunt for your point.</p><h2>3. Range without risk</h2><p>Reach for more precise vocabulary, but not for words you cannot spell or use accurately.</p><p><em>TODO(client): replace with your own teaching content.</em></p>",
  },
  {
    slug: "open-day-at-imtiyaz-el-djazair",
    type: "EVENT",
    title: "Open day: visit the school and the exam centre",
    excerpt:
      "Tour the classrooms and exam rooms, meet the teachers and take a free placement assessment.",
    category: "Event",
    coverUrl: "/assets/gallery/cover-01.webp",
    location: "Imtiyaz El Djazair — main campus",
    content:
      "<p>Come and see the centre. We will show you the classrooms, the exam rooms and how a session runs, and you can take a free placement assessment on the day.</p><h2>Programme</h2><ul><li>Guided tour of the campus</li><li>Free placement assessment</li><li>Q&amp;A with the teaching team</li><li>Information on upcoming examination sessions</li></ul><p><em>TODO(client): set the real date, time and address for this event.</em></p>",
  },
  {
    slug: "free-ielts-mock-test-saturday",
    type: "EVENT",
    title: "Free IELTS mock test morning",
    excerpt:
      "A full-length mock sat in our exam rooms, marked and returned with a band estimate and written feedback.",
    category: "Event",
    coverUrl: "/assets/gallery/cover-02.webp",
    location: "Imtiyaz El Djazair — exam centre",
    content:
      "<p>Sit a full-length IELTS mock test in our exam rooms, under real timing and real rules. Papers are marked against the official descriptors and returned with a band estimate and written feedback.</p><p>Places are limited. Register in advance through the contact form.</p><p><em>TODO(client): set the real date and registration details.</em></p>",
  },
];

// The school's own photographs. Captions are localized; `json()` stores the
// { en, fr, ar } object the same way the admin editor writes it.
const GALLERY = [
  { title: json({ en: "Reception desk", fr: "Comptoir d'accueil", ar: "مكتب الاستقبال" }), album: "Reception", imageUrl: "/assets/photos/reception-01.webp" },
  { title: json({ en: "Reception", fr: "L'accueil", ar: "الاستقبال" }), album: "Reception", imageUrl: "/assets/photos/reception-02.webp" },
  { title: json({ en: "Welcome desk", fr: "Le comptoir d'accueil", ar: "مكتب الترحيب" }), album: "Reception", imageUrl: "/assets/photos/reception-03.webp" },
  { title: json({ en: "Official IELTS test centre", fr: "Centre d'examen IELTS officiel", ar: "مركز اختبار آيلتس معتمد" }), album: "Reception", imageUrl: "/assets/photos/reception-04.webp" },
  { title: json({ en: "Entrance hall", fr: "Le hall d'entrée", ar: "بهو الدخول" }), album: "Reception", imageUrl: "/assets/photos/reception-05.webp" },
  { title: json({ en: "Waiting area", fr: "L'espace d'attente", ar: "منطقة الانتظار" }), album: "Campus", imageUrl: "/assets/photos/waiting-01.webp" },
  { title: json({ en: "Study and waiting space", fr: "Espace d'attente et de travail", ar: "فضاء الانتظار والمراجعة" }), album: "Campus", imageUrl: "/assets/photos/waiting-02.webp" },
  { title: json({ en: "Towards the classrooms", fr: "Vers les salles de cours", ar: "نحو قاعات الدراسة" }), album: "Campus", imageUrl: "/assets/photos/corridor-01.webp" },
  { title: json({ en: "IELTS registration point", fr: "Point d'inscription IELTS", ar: "نقطة التسجيل للآيلتس" }), album: "Campus", imageUrl: "/assets/photos/corridor-02.webp" },
  { title: json({ en: "Main corridor", fr: "Le couloir principal", ar: "الممر الرئيسي" }), album: "Campus", imageUrl: "/assets/photos/corridor-03.webp" },
  { title: json({ en: "A classroom", fr: "Une salle de cours", ar: "قاعة دراسة" }), album: "Campus", imageUrl: "/assets/photos/classroom-01.webp" },
  { title: json({ en: "Exam room, individual desks", fr: "Salle d'examen, postes individuels", ar: "قاعة امتحان بطاولات فردية" }), album: "Exam Center", imageUrl: "/assets/photos/exam-room-01.webp" },
  { title: json({ en: "Exam room set up for a session", fr: "Salle d'examen prête pour une session", ar: "قاعة امتحان جاهزة للجلسة" }), album: "Exam Center", imageUrl: "/assets/photos/exam-room-02.webp" },
];

async function seedDemoContent() {
  if (!demoEnabled) {
    console.log("· SEED_DEMO_CONTENT=false — demo content skipped");
    return;
  }

  if ((await db.partner.count()) === 0) {
    await db.partner.createMany({
      data: PARTNERS.map((partner, index) => ({ ...partner, order: index, isActive: true, isVerified: false })),
    });
  }
  if ((await db.service.count()) === 0) {
    await db.service.createMany({
      data: SERVICES.map((service, index) => ({ ...service, order: index, isActive: true })),
    });
  }
  if ((await db.stat.count()) === 0) {
    await db.stat.createMany({
      data: STATS.map((stat, index) => ({ ...stat, order: index, isActive: true })),
    });
  }
  if ((await db.testimonial.count()) === 0) {
    await db.testimonial.createMany({
      data: TESTIMONIALS.map((item, index) => ({ ...item, order: index, isActive: true, photoUrl: "" })),
    });
  }
  if ((await db.faqItem.count()) === 0) {
    await db.faqItem.createMany({
      data: FAQ.map((item, index) => ({ ...item, order: index, isActive: true })),
    });
  }
  if ((await db.galleryItem.count()) === 0) {
    await db.galleryItem.createMany({
      data: GALLERY.map((item, index) => ({ ...item, order: index, isActive: true })),
    });
  }
  if ((await db.post.count()) === 0) {
    const now = Date.now();
    for (const [index, post] of POSTS.entries()) {
      await db.post.create({
        data: {
          slug: post.slug,
          type: post.type,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          coverUrl: post.coverUrl,
          category: post.category,
          location: post.location ?? "",
          isPublished: true,
          publishedAt: new Date(now - index * 86_400_000 * 6),
          eventDate: post.type === "EVENT" ? new Date(now + (index + 2) * 86_400_000 * 5) : null,
        },
      });
    }
  }
  console.log("✓ Demo content ensured (marked TODO(client) where it must be replaced)");
}

async function main() {
  console.log("\nSeeding Imtiyaz El Djazair…\n");
  await seedSuperAdmin();
  await seedSettings();
  await backfillContactLinks();
  await pruneRemovedSocialFields();
  await normaliseBrandPaths();
  await seedMenu();
  await seedPages();
  await seedForms();
  await seedDemoContent();
  console.log("\nDone. Sign in at /admin\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
