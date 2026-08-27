import type { Field } from "./section-types";

/**
 * Settings buckets reuse the same field-schema mechanism as sections and
 * collections, so their editors are rendered by <FieldsEditor> too.
 * (Fields that need bespoke controls — enabled languages, theme colours —
 * are handled by their own components.)
 */

export const GENERAL_FIELDS: Field[] = [
  { name: "siteName", label: "Site name", type: "text", group: "Identity" },
  { name: "tagline", label: "Tagline", type: "localizedText", group: "Identity", help: "Shown under the logo, e.g. “School & Exam Center”." },
  { name: "shortDescription", label: "Short description", type: "localizedTextarea", group: "Identity", help: "Used as the default meta description if the SEO one is empty." },
  { name: "logoUrl", label: "Logo", type: "image", group: "Branding", help: "Upload the school\u2019s own artwork. Nothing is drawn in code \u2014 if this is empty the header shows the school name as plain text." },
  { name: "logoDarkUrl", label: "Logo for dark backgrounds", type: "image", group: "Branding", help: "Optional. A light-coloured version, used on the site\u2019s dark header and footer." },
  { name: "faviconUrl", label: "Favicon", type: "image", group: "Branding", help: "A square image, 256\u00d7256 or larger." },
  { name: "ogImageUrl", label: "Social share image", type: "image", group: "Branding", help: "1200×630 works best." },
  { name: "navCtaLabel", label: "Header button label", type: "localizedText", group: "Header" },
  { name: "navCtaHref", label: "Header button link", type: "link", group: "Header" },
  {
    name: "demoContentNotice",
    label: "Show the “demo content” reminder in the dashboard",
    type: "boolean",
    group: "Branding",
    help: "Turn this off once the placeholder photos, logos and articles have been replaced.",
  },
];

export const CONTACT_FIELDS: Field[] = [
  { name: "addressLine1", label: "Address line 1", type: "text", group: "Address" },
  { name: "addressLine2", label: "Address line 2", type: "text", group: "Address" },
  { name: "city", label: "City", type: "text", group: "Address" },
  { name: "country", label: "Country", type: "text", group: "Address" },
  { name: "phonePrimary", label: "Phone", type: "text", group: "Contact" },
  { name: "phoneSecondary", label: "Second phone", type: "text", group: "Contact" },
  { name: "email", label: "Email", type: "text", group: "Contact" },
  { name: "admissionsEmail", label: "Admissions email", type: "text", group: "Contact" },
  {
    name: "mapEmbedUrl",
    label: "Map embed URL",
    type: "text",
    group: "Map",
    help: "The src of a Google Maps embed iframe (must start with https://).",
  },
  { name: "mapsLink", label: "Map link", type: "link", group: "Map", help: "Where the address links to." },
  {
    name: "openingHours",
    label: "Opening hours",
    type: "repeater",
    group: "Opening hours",
    itemLabelField: "day",
    addLabel: "Add a row",
    max: 10,
    fields: [
      { name: "day", label: "Day(s)", type: "localizedText" },
      { name: "hours", label: "Hours", type: "text", placeholder: "08:30 – 18:00" },
    ],
  },
];

export const SOCIAL_FIELDS: Field[] = [
  { name: "facebook", label: "Facebook", type: "link" },
  { name: "instagram", label: "Instagram", type: "link" },
  { name: "linkedin", label: "LinkedIn", type: "link" },
  { name: "youtube", label: "YouTube", type: "link" },
  { name: "tiktok", label: "TikTok", type: "link" },
  { name: "x", label: "X", type: "link" },
  { name: "whatsapp", label: "WhatsApp", type: "link", help: "e.g. https://wa.me/213000000000" },
];

export const SEO_FIELDS: Field[] = [
  { name: "defaultTitle", label: "Default page title", type: "text", group: "Titles" },
  {
    name: "titleTemplate",
    label: "Title template",
    type: "text",
    group: "Titles",
    help: "Use %s where the page title goes, e.g. “%s | Imtiyaz El Djazair”.",
  },
  { name: "defaultDescription", label: "Default meta description", type: "textarea", group: "Titles" },
  { name: "twitterHandle", label: "X / Twitter handle", type: "text", group: "Social" },
  {
    name: "googleSiteVerification",
    label: "Google Search Console verification",
    type: "text",
    group: "Verification",
    help: "The content value of the google-site-verification meta tag.",
  },
  {
    name: "organizationType",
    label: "Schema.org type",
    type: "select",
    group: "Structured data",
    options: [
      { value: "EducationalOrganization", label: "EducationalOrganization" },
      { value: "School", label: "School" },
      { value: "CollegeOrUniversity", label: "CollegeOrUniversity" },
      { value: "LocalBusiness", label: "LocalBusiness" },
    ],
  },
  {
    name: "robotsIndex",
    label: "Allow search engines to index this site",
    type: "boolean",
    group: "Indexing",
    help: "Turn off while the site is being built. robots.txt and every page follow this switch.",
  },
];

export const FOOTER_FIELDS: Field[] = [
  { name: "about", label: "Footer intro", type: "localizedTextarea", group: "Content" },
  { name: "showPartners", label: "Show the partner logo strip", type: "boolean", group: "Content" },
  { name: "copyright", label: "Copyright line", type: "localizedText", group: "Content", help: "The year is added automatically." },
  {
    name: "columns",
    label: "Link columns",
    type: "repeater",
    group: "Columns",
    itemLabelField: "title",
    addLabel: "Add column",
    max: 4,
    fields: [
      { name: "id", label: "Internal id", type: "text" },
      { name: "title", label: "Column heading", type: "localizedText" },
      {
        name: "links",
        label: "Links",
        type: "repeater",
        itemLabelField: "label",
        addLabel: "Add link",
        max: 10,
        fields: [
          { name: "id", label: "Internal id", type: "text" },
          { name: "label", label: "Label", type: "localizedText" },
          { name: "href", label: "Link", type: "link" },
        ],
      },
    ],
  },
  {
    name: "bottomLinks",
    label: "Bottom bar links",
    type: "repeater",
    group: "Bottom bar",
    itemLabelField: "label",
    addLabel: "Add link",
    max: 6,
    fields: [
      { name: "id", label: "Internal id", type: "text" },
      { name: "label", label: "Label", type: "localizedText" },
      { name: "href", label: "Link", type: "link" },
    ],
  },
];
