import type { Field } from "./section-types";
import type { Permission } from "./permissions";

/* -------------------------------------------------------------------------
 * Every simple content collection is described once here. The admin renders
 * the list, the editor form and the validation from this definition, so adding
 * a field is a one-line change with no new UI code.
 * ---------------------------------------------------------------------- */

export type CollectionKey =
  | "services"
  | "stats"
  | "testimonials"
  | "faq"
  | "gallery"
  | "partners"
  | "popups";

export type CollectionDefinition = {
  key: CollectionKey;
  label: string;
  singular: string;
  description: string;
  icon: string;
  permission: Permission;
  orderable: boolean;
  /** Field used as the row title in the admin list. */
  titleField: string;
  subtitleField?: string;
  imageField?: string;
  fields: Field[];
};

const ICON_OPTIONS = [
  "star", "award", "book", "globe", "users", "shield", "target", "chart", "pen",
  "mic", "headphones", "clipboard", "graduation", "heart", "sparkles", "building",
  "compass", "clock",
].map((value) => ({ value, label: value }));

export const COLLECTIONS: Record<CollectionKey, CollectionDefinition> = {
  services: {
    key: "services",
    label: "Services",
    singular: "Service",
    description: "The cards shown by every “Services / Programs” section.",
    icon: "book",
    permission: "content.edit",
    orderable: true,
    titleField: "title",
    subtitleField: "description",
    fields: [
      { name: "title", label: "Title", type: "localizedText" },
      { name: "description", label: "Description", type: "localizedTextarea" },
      { name: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
      { name: "href", label: "Link", type: "link", help: "Where the “Learn more” link goes." },
      { name: "isActive", label: "Visible on the website", type: "boolean" },
    ],
  },
  stats: {
    key: "stats",
    label: "Statistics",
    singular: "Statistic",
    description: "The animated counters in the hero and the statistics band.",
    icon: "chart",
    permission: "content.edit",
    orderable: true,
    titleField: "label",
    fields: [
      { name: "label", label: "Label", type: "localizedText" },
      { name: "value", label: "Number", type: "number", min: 0, max: 10_000_000 },
      { name: "suffix", label: "Suffix", type: "text", placeholder: "+", help: "Shown after the number, e.g. “+” or “%”." },
      { name: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
      { name: "isActive", label: "Visible on the website", type: "boolean" },
    ],
  },
  testimonials: {
    key: "testimonials",
    label: "Testimonials",
    singular: "Testimonial",
    description: "Student quotes. Get written permission before publishing a name or photo.",
    icon: "quote",
    permission: "content.edit",
    orderable: true,
    titleField: "name",
    subtitleField: "quote",
    imageField: "photoUrl",
    fields: [
      { name: "name", label: "Student name", type: "text" },
      { name: "program", label: "Programme / result", type: "localizedText", placeholder: "IELTS Academic — Band 7.5" },
      { name: "quote", label: "Testimonial", type: "localizedTextarea" },
      { name: "rating", label: "Rating (1–5)", type: "number", min: 1, max: 5 },
      { name: "photoUrl", label: "Photo", type: "image" },
      { name: "isActive", label: "Visible on the website", type: "boolean" },
    ],
  },
  faq: {
    key: "faq",
    label: "FAQ",
    singular: "Question",
    description: "Questions shown in every FAQ section.",
    icon: "help",
    permission: "content.edit",
    orderable: true,
    titleField: "question",
    subtitleField: "answer",
    fields: [
      { name: "question", label: "Question", type: "localizedText" },
      { name: "answer", label: "Answer", type: "localizedTextarea" },
      { name: "isActive", label: "Visible on the website", type: "boolean" },
    ],
  },
  gallery: {
    key: "gallery",
    label: "Gallery",
    singular: "Photo",
    description: "Campus photos. Group them into albums so a section can show just one album.",
    icon: "image",
    permission: "content.edit",
    orderable: true,
    titleField: "title",
    subtitleField: "album",
    imageField: "imageUrl",
    fields: [
      { name: "imageUrl", label: "Photo", type: "image" },
      { name: "title", label: "Caption", type: "localizedText" },
      { name: "album", label: "Album", type: "text", placeholder: "Campus" },
      { name: "isActive", label: "Visible on the website", type: "boolean" },
    ],
  },
  partners: {
    key: "partners",
    label: "Partners & Sponsors",
    singular: "Partner",
    description:
      "Logos shown in the partners section and the footer. Only upload artwork you have permission to display, and only describe a relationship the school has actually confirmed.",
    icon: "handshake",
    permission: "partners.manage",
    orderable: true,
    titleField: "name",
    subtitleField: "description",
    imageField: "logoUrl",
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "logoUrl", label: "Logo", type: "image", help: "SVG or transparent PNG works best." },
      { name: "description", label: "Description", type: "localizedTextarea", help: "Leave empty to show only the logo and the name." },
      { name: "website", label: "Website", type: "link" },
      {
        name: "type",
        label: "Relationship",
        type: "select",
        options: [
          { value: "PARTNER", label: "Partner" },
          { value: "SPONSOR", label: "Sponsor" },
          { value: "CERTIFICATION", label: "Certification" },
          { value: "ASSOCIATION", label: "Association" },
        ],
      },
      {
        name: "isVerified",
        label: "Relationship confirmed in writing",
        type: "boolean",
        help: "Internal flag. Tick it once you hold written confirmation and permission to use the logo.",
      },
      { name: "isActive", label: "Visible on the website", type: "boolean" },
    ],
  },
  popups: {
    key: "popups",
    label: "Popups",
    singular: "Popup",
    description: "Announcements shown over the website. Only one active popup is displayed at a time.",
    icon: "megaphone",
    permission: "popups.manage",
    orderable: false,
    titleField: "name",
    subtitleField: "title",
    imageField: "imageUrl",
    fields: [
      { name: "name", label: "Internal name", type: "text", help: "Only visible here." },
      { name: "title", label: "Heading", type: "text" },
      { name: "body", label: "Text", type: "textarea" },
      { name: "imageUrl", label: "Image", type: "image" },
      { name: "ctaLabel", label: "Button label", type: "text" },
      { name: "ctaHref", label: "Button link", type: "link" },
      {
        name: "frequency",
        label: "How often",
        type: "select",
        options: [
          { value: "ONCE", label: "Once per visitor" },
          { value: "DAILY", label: "Once a day" },
          { value: "ALWAYS", label: "Every visit" },
        ],
      },
      { name: "delayMs", label: "Delay before showing (ms)", type: "number", min: 500, max: 60_000 },
      { name: "startsAt", label: "Start date", type: "text", placeholder: "YYYY-MM-DD", help: "Optional." },
      { name: "endsAt", label: "End date", type: "text", placeholder: "YYYY-MM-DD", help: "Optional." },
      { name: "isActive", label: "Active", type: "boolean" },
    ],
  },
};

/** Text fields whose values are stored as localized JSON. */
export function localizedFieldNames(key: CollectionKey): string[] {
  return COLLECTIONS[key].fields
    .filter((field) => field.type === "localizedText" || field.type === "localizedTextarea")
    .map((field) => field.name);
}

export const COLLECTION_KEYS = Object.keys(COLLECTIONS) as CollectionKey[];

export function isCollectionKey(value: string): value is CollectionKey {
  return (COLLECTION_KEYS as string[]).includes(value);
}
