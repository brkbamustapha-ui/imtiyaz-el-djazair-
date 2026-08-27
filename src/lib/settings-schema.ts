import type { LocalizedText } from "./i18n";

/* -------------------------------------------------------------------------
 * Every value below is editable from /admin — nothing here is hard-coded into
 * a component. The objects are the DEFAULTS used before the first save (and
 * by the seed script).
 * ---------------------------------------------------------------------- */

export type GeneralSettings = {
  siteName: string;
  tagline: LocalizedText;
  shortDescription: LocalizedText;
  logoUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  navCtaLabel: LocalizedText;
  navCtaHref: string;
  enabledLocales: string[];
  defaultLocale: string;
  /** Shows a small "demo content" hint in the admin until the owner clears it. */
  demoContentNotice: boolean;
};

export type ContactSettings = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  phonePrimary: string;
  phoneSecondary: string;
  email: string;
  admissionsEmail: string;
  mapEmbedUrl: string;
  mapsLink: string;
  openingHours: { day: LocalizedText; hours: string }[];
};

export type SocialSettings = {
  facebook: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  x: string;
  whatsapp: string;
};

export type AppearanceSettings = {
  preset: string;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryDark: string;
    accent: string;
    accentSoft: string;
    border: string;
  };
  fontHeading: string;
  fontBody: string;
  headingScale: number;
  radius: number;
  shadowStrength: number;
  glassOpacity: number;
  buttonStyle: "pill" | "rounded" | "square";
  animationsEnabled: boolean;
  animationSpeed: number;
  effects3dEnabled: boolean;
  effects3dIntensity: number;
  grain: boolean;
};

export type SeoSettings = {
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  keywords: string[];
  twitterHandle: string;
  googleSiteVerification: string;
  robotsIndex: boolean;
  organizationType: string;
};

export type AdvancedSettings = {
  customCss: string;
  headScripts: string;
  bodyEndScripts: string;
  maintenanceMode: boolean;
  maintenanceMessage: LocalizedText;
};

export type FooterColumn = {
  id: string;
  title: LocalizedText;
  links: { id: string; label: LocalizedText; href: string }[];
};

export type FooterSettings = {
  about: LocalizedText;
  columns: FooterColumn[];
  showPartners: boolean;
  copyright: LocalizedText;
  bottomLinks: { id: string; label: LocalizedText; href: string }[];
};

export type SettingsMap = {
  general: GeneralSettings;
  contact: ContactSettings;
  social: SocialSettings;
  appearance: AppearanceSettings;
  seo: SeoSettings;
  advanced: AdvancedSettings;
  footer: FooterSettings;
};

export type SettingsKey = keyof SettingsMap;

/* ---------------------------------- Themes -------------------------------- */

export const THEME_PRESETS: Record<
  string,
  { label: string; colors: AppearanceSettings["colors"] }
> = {
  "luxury-gold": {
    label: "Luxury Gold",
    colors: {
      background: "#070b14",
      surface: "#0d1424",
      surfaceElevated: "#131c30",
      text: "#f4f6fb",
      textMuted: "#9aa7bd",
      primary: "#17aee0",
      primaryDark: "#233e72",
      accent: "#d4af37",
      accentSoft: "#f0dc9a",
      border: "#1e2a44",
    },
  },
  "international-blue": {
    label: "International Blue",
    colors: {
      background: "#050e1f",
      surface: "#0b1a33",
      surfaceElevated: "#102345",
      text: "#f2f7ff",
      textMuted: "#93a8c9",
      primary: "#2ea8ea",
      primaryDark: "#1b3a6b",
      accent: "#63d2ff",
      accentSoft: "#b9e9ff",
      border: "#17325c",
    },
  },
  "elegant-dark": {
    label: "Elegant Dark",
    colors: {
      background: "#0a0a0c",
      surface: "#131316",
      surfaceElevated: "#1b1b20",
      text: "#f5f5f7",
      textMuted: "#a1a1aa",
      primary: "#e2e2e6",
      primaryDark: "#3f3f46",
      accent: "#c8a24a",
      accentSoft: "#e6d3a3",
      border: "#26262c",
    },
  },
  "modern-academy": {
    label: "Modern Academy",
    colors: {
      background: "#f7f9fc",
      surface: "#ffffff",
      surfaceElevated: "#eef3fa",
      text: "#0f1c33",
      textMuted: "#4d5f7d",
      primary: "#17aee0",
      primaryDark: "#233e72",
      accent: "#b8860b",
      accentSoft: "#e8c96a",
      border: "#d9e3f0",
    },
  },
};

export const FONT_CHOICES = [
  { value: "Sora", label: "Sora — geometric, modern" },
  { value: "Playfair Display", label: "Playfair Display — editorial serif" },
  { value: "Inter", label: "Inter — neutral UI sans" },
  { value: "Manrope", label: "Manrope — soft grotesque" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond — classic serif" },
  { value: "IBM Plex Sans Arabic", label: "IBM Plex Sans Arabic — Arabic support" },
];

/* --------------------------------- Defaults ------------------------------- */

export const DEFAULT_SETTINGS: SettingsMap = {
  general: {
    siteName: "Imtiyaz El Djazair",
    tagline: {
      en: "School & Exam Center",
      fr: "École et Centre d'Examen",
      ar: "مدرسة ومركز امتحانات",
    },
    shortDescription: {
      en: "An international school and exam centre in Algeria offering English courses, IELTS preparation and academic support.",
      fr: "Une école internationale et un centre d'examen en Algérie proposant des cours d'anglais, la préparation à l'IELTS et un accompagnement académique.",
      ar: "مدرسة دولية ومركز امتحانات في الجزائر يقدم دورات في اللغة الإنجليزية والتحضير للآيلتس والدعم الأكاديمي.",
    },
    // Empty by default: the logo is whatever image file the school supplies,
    // either uploaded from the dashboard or dropped into /public/assets/logo.
    logoUrl: "",
    logoDarkUrl: "",
    faviconUrl: "",
    ogImageUrl: "",
    navCtaLabel: { en: "Apply Now", fr: "S'inscrire", ar: "سجّل الآن" },
    navCtaHref: "/contact",
    enabledLocales: ["en", "fr", "ar"],
    defaultLocale: "en",
    demoContentNotice: true,
  },
  contact: {
    // TODO(client): replace with the school's real contact details.
    addressLine1: "Add your street address",
    addressLine2: "",
    city: "Algiers",
    country: "Algeria",
    phonePrimary: "+213 000 00 00 00",
    phoneSecondary: "",
    email: "contact@imtiyazeldjazair.com",
    admissionsEmail: "admissions@imtiyazeldjazair.com",
    mapEmbedUrl: "",
    // The school's own Google Maps pin, as published on its Instagram bio.
    mapsLink: "https://maps.app.goo.gl/6JRUTa2CWgjvEnVx9",
    openingHours: [
      { day: { en: "Sunday – Thursday", fr: "Dimanche – Jeudi", ar: "الأحد – الخميس" }, hours: "08:30 – 18:00" },
      { day: { en: "Saturday", fr: "Samedi", ar: "السبت" }, hours: "09:00 – 15:00" },
      { day: { en: "Friday", fr: "Vendredi", ar: "الجمعة" }, hours: "Closed" },
    ],
  },
  social: {
    // Accounts the school confirmed. The rest stay empty: an empty field simply
    // hides its icon, so nothing links to an account that does not exist.
    facebook: "",
    instagram: "https://www.instagram.com/imtiyaz_el_djazair_officiel",
    linkedin: "",
    youtube: "",
    tiktok: "https://www.tiktok.com/@imtiyazaldjazair",
    x: "",
    whatsapp: "",
  },
  appearance: {
    preset: "luxury-gold",
    colors: THEME_PRESETS["luxury-gold"].colors,
    fontHeading: "Sora",
    fontBody: "Inter",
    headingScale: 1,
    radius: 18,
    shadowStrength: 0.5,
    glassOpacity: 0.06,
    buttonStyle: "pill",
    animationsEnabled: true,
    animationSpeed: 1,
    effects3dEnabled: true,
    effects3dIntensity: 0.75,
    grain: true,
  },
  seo: {
    defaultTitle: "Imtiyaz El Djazair — School & Exam Center",
    titleTemplate: "%s | Imtiyaz El Djazair",
    defaultDescription:
      "Imtiyaz El Djazair is a school and exam centre in Algeria offering English courses, IELTS preparation, academic support and international opportunities.",
    keywords: [
      "Imtiyaz El Djazair",
      "English school Algeria",
      "IELTS preparation",
      "IELTS Algeria",
      "exam center",
      "English courses",
    ],
    twitterHandle: "",
    googleSiteVerification: "",
    robotsIndex: true,
    organizationType: "EducationalOrganization",
  },
  advanced: {
    customCss: "",
    headScripts: "",
    bodyEndScripts: "",
    maintenanceMode: false,
    maintenanceMessage: {
      en: "We are performing scheduled maintenance. Please come back shortly.",
      fr: "Maintenance en cours. Merci de revenir dans quelques instants.",
      ar: "نقوم بأعمال صيانة. يرجى العودة بعد قليل.",
    },
  },
  footer: {
    about: {
      en: "A school and exam centre built around one idea: give every student the confidence to perform internationally.",
      fr: "Une école et un centre d'examen construits autour d'une idée : donner à chaque étudiant la confiance nécessaire pour réussir à l'international.",
      ar: "مدرسة ومركز امتحانات بُنيا حول فكرة واحدة: منح كل طالب الثقة للنجاح دوليًا.",
    },
    columns: [
      {
        id: "school",
        title: { en: "School", fr: "École", ar: "المدرسة" },
        links: [
          { id: "about", label: { en: "About", fr: "À propos", ar: "من نحن" }, href: "/about" },
          { id: "programs", label: { en: "Programs", fr: "Programmes", ar: "البرامج" }, href: "/programs" },
          { id: "gallery", label: { en: "Campus", fr: "Campus", ar: "الحرم" }, href: "/gallery" },
        ],
      },
      {
        id: "exams",
        title: { en: "Exams", fr: "Examens", ar: "الامتحانات" },
        links: [
          { id: "ielts", label: { en: "IELTS", fr: "IELTS", ar: "آيلتس" }, href: "/ielts" },
          { id: "exam-center", label: { en: "Exam Center", fr: "Centre d'examen", ar: "مركز الامتحانات" }, href: "/exam-center" },
        ],
      },
      {
        id: "more",
        title: { en: "More", fr: "Plus", ar: "المزيد" },
        links: [
          { id: "news", label: { en: "News & Events", fr: "Actualités", ar: "الأخبار" }, href: "/news" },
          { id: "contact", label: { en: "Contact", fr: "Contact", ar: "اتصل بنا" }, href: "/contact" },
        ],
      },
    ],
    showPartners: true,
    copyright: {
      en: "Imtiyaz El Djazair. All rights reserved.",
      fr: "Imtiyaz El Djazair. Tous droits réservés.",
      ar: "امتياز الجزائر. جميع الحقوق محفوظة.",
    },
    bottomLinks: [
      { id: "privacy", label: { en: "Privacy Policy", fr: "Confidentialité", ar: "الخصوصية" }, href: "/privacy-policy" },
      { id: "terms", label: { en: "Terms & Conditions", fr: "Conditions", ar: "الشروط" }, href: "/terms" },
    ],
  },
};
