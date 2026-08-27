import { z } from "zod";
import type { LocalizedText } from "./i18n";

export const FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "number",
  "date",
  "select",
  "checkbox",
  "radio",
  "textarea",
  "file",
] as const;

export type FormFieldType = (typeof FIELD_TYPES)[number];

export type FormFieldDef = {
  id: string;
  name: string;
  label: LocalizedText | string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
  width?: "full" | "half";
  maxLength?: number;
};

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Short text",
  email: "Email",
  tel: "Phone",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  checkbox: "Checkbox",
  radio: "Radio buttons",
  textarea: "Long text",
  file: "File upload",
};

export const formFieldSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only."),
  label: z.union([z.string(), z.record(z.string())]),
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
  placeholder: z.string().max(120).optional(),
  help: z.string().max(200).optional(),
  options: z.array(z.string().max(120)).max(40).optional(),
  width: z.enum(["full", "half"]).optional(),
  maxLength: z.number().int().min(1).max(10000).optional(),
});

export const formFieldsSchema = z.array(formFieldSchema).max(40);

/** Reserved names the submission handler uses for its own bookkeeping. */
export const RESERVED_FIELD_NAMES = ["_csrf", "_hp", "_locale", "_ts"];

export type ValidationResult =
  | { ok: true; value: Record<string, string> }
  | { ok: false; errors: Record<string, string> };

/**
 * Server-side validation of one submission against the form definition.
 * The browser validation is a convenience; this is the one that counts.
 */
export function validateSubmission(
  fields: FormFieldDef[],
  input: Record<string, string>,
): ValidationResult {
  const errors: Record<string, string> = {};
  const value: Record<string, string> = {};

  for (const field of fields) {
    const raw = (input[field.name] ?? "").toString().trim();

    if (field.required && raw === "") {
      errors[field.name] = "This field is required.";
      continue;
    }
    if (raw === "") {
      value[field.name] = "";
      continue;
    }
    if (raw.length > (field.maxLength ?? 4000)) {
      errors[field.name] = `Maximum ${field.maxLength ?? 4000} characters.`;
      continue;
    }

    switch (field.type) {
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)) {
          errors[field.name] = "Enter a valid email address.";
        }
        break;
      case "tel":
        if (!/^[+0-9 ().-]{6,24}$/.test(raw)) {
          errors[field.name] = "Enter a valid phone number.";
        }
        break;
      case "number":
        if (!Number.isFinite(Number(raw))) {
          errors[field.name] = "Enter a number.";
        }
        break;
      case "date":
        if (Number.isNaN(Date.parse(raw))) {
          errors[field.name] = "Enter a valid date.";
        }
        break;
      case "select":
      case "radio":
        if (field.options && field.options.length > 0 && !field.options.includes(raw)) {
          errors[field.name] = "Choose one of the available options.";
        }
        break;
      default:
        break;
    }

    if (!errors[field.name]) value[field.name] = raw;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export const DEFAULT_CONTACT_FIELDS: FormFieldDef[] = [
  {
    id: "fullName",
    name: "fullName",
    type: "text",
    required: true,
    width: "half",
    maxLength: 120,
    label: { en: "Full Name", fr: "Nom complet", ar: "الاسم الكامل" },
  },
  {
    id: "email",
    name: "email",
    type: "email",
    required: true,
    width: "half",
    maxLength: 160,
    label: { en: "Email", fr: "E-mail", ar: "البريد الإلكتروني" },
  },
  {
    id: "phone",
    name: "phone",
    type: "tel",
    required: false,
    width: "half",
    maxLength: 24,
    label: { en: "Phone", fr: "Téléphone", ar: "الهاتف" },
  },
  {
    id: "subject",
    name: "subject",
    type: "select",
    required: true,
    width: "half",
    label: { en: "Subject", fr: "Sujet", ar: "الموضوع" },
    options: [
      "IELTS preparation",
      "IELTS registration",
      "English courses",
      "Exam centre",
      "Other",
    ],
  },
  {
    id: "message",
    name: "message",
    type: "textarea",
    required: true,
    width: "full",
    maxLength: 3000,
    label: { en: "Message", fr: "Message", ar: "الرسالة" },
  },
];
