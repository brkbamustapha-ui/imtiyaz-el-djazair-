import { getFormBySlug } from "@/server/content";
import { getSetting } from "@/lib/settings";
import { ensureCsrfToken } from "@/lib/csrf";
import { parseJson } from "@/lib/json";
import { DynamicForm } from "@/components/public/DynamicForm";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { t } from "@/lib/i18n";
import { safeHref } from "@/lib/utils";
import { contactPhones, telHref } from "@/lib/settings-schema";
import { DEFAULT_CONTACT_FIELDS, type FormFieldDef } from "@/lib/forms";
import { bool, ls, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";

export async function ContactSection({ data, locale, sectionId }: SectionProps) {
  const [contact, social] = await Promise.all([getSetting("contact"), getSetting("social")]);
  const showForm = bool(data, "showForm", true);
  const formSlug = str(data, "formSlug", "contact") || "contact";
  const form = showForm ? await getFormBySlug(formSlug) : null;
  const csrfToken = showForm ? await ensureCsrfToken() : "";

  const fields = form
    ? parseJson<FormFieldDef[]>(form.fieldsJson, DEFAULT_CONTACT_FIELDS)
    : DEFAULT_CONTACT_FIELDS;

  const phones = contactPhones(contact);
  const addressValue = [contact.addressLine1, contact.addressLine2, contact.city, contact.country]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");

  type Detail = {
    icon: string;
    label: string;
    value?: string;
    href?: string;
    /** Several clickable values under one heading — the school has five lines. */
    items?: { text: string; href: string }[];
  };

  const details = [
    // Keyed off the assembled value, not addressLine1: the street line is not
    // known, but "Alger, Algérie" plus the map pin still locates the school.
    addressValue && {
      icon: "pin",
      label: locale === "fr" ? "Adresse" : locale === "ar" ? "العنوان" : "Address",
      value: addressValue,
      href: contact.mapsLink || undefined,
    },
    phones.length > 0 && {
      icon: "phone",
      label: locale === "fr" ? "Téléphone" : locale === "ar" ? "الهاتف" : "Phone",
      items: phones.map((number) => ({ text: number, href: telHref(number) })),
    },
    contact.email && {
      icon: "mail",
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
    },
  ].filter(Boolean) as Detail[];

  // The school's accounts and its map pin, as icons. Each entry only appears
  // when the matching setting holds a link, so nothing ever points nowhere.
  const links = (
    [
      ["instagram", social.instagram, "Instagram"],
      ["tiktok", social.tiktok, "TikTok"],
      ["whatsapp", social.whatsapp, "WhatsApp"],
      [
        "pin",
        contact.mapsLink,
        locale === "fr" ? "Google Maps" : locale === "ar" ? "خرائط جوجل" : "Google Maps",
      ],
    ] as const
  )
    .filter(([, href]) => href?.trim())
    .map(([icon, href, label]) => ({ icon, href: href as string, label }));

  return (
    <SectionShell id={sectionId}>
      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      <div className="mt-14 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
        <Reveal direction="right">
          <div className="space-y-8">
            {bool(data, "showDetails", true) && details.length > 0 && (
              <ul className="space-y-5">
                {details.map((detail) => (
                  <li key={detail.label} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--c-border)] bg-[rgb(var(--c-accent-rgb)/0.08)] text-[var(--c-accent)]">
                      <Icon name={detail.icon} size={18} />
                    </span>
                    <div>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
                        {detail.label}
                      </p>
                      {detail.items ? (
                        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          {detail.items.map((item) => (
                            <li key={item.href}>
                              <a
                                href={item.href}
                                dir="ltr"
                                className="text-[0.94rem] text-[var(--c-text)] transition-colors hover:text-[var(--c-accent)]"
                              >
                                {item.text}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : detail.href ? (
                        <a
                          href={detail.href}
                          target={detail.href.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className="mt-1 block text-[0.94rem] text-[var(--c-text)] transition-colors hover:text-[var(--c-accent)]"
                        >
                          {detail.value}
                        </a>
                      ) : (
                        <p className="mt-1 text-[0.94rem] text-[var(--c-text)]">{detail.value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {links.length > 0 && (
              <div>
                <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
                  {locale === "fr"
                    ? "Suivez-nous"
                    : locale === "ar"
                      ? "تابعونا"
                      : "Follow us"}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {links.map((link) => (
                    <li key={link.icon}>
                      {/* Named, not just an icon: three unlabelled glyphs in a row
                          read as decoration, and a visitor looking for the
                          school's Instagram does not find it. */}
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--c-border)] bg-[rgb(var(--c-accent-rgb)/0.08)] px-3.5 text-sm font-medium text-[var(--c-accent)] transition-all hover:-translate-y-0.5 hover:border-[var(--c-accent)] hover:bg-[rgb(var(--c-accent-rgb)/0.16)]"
                      >
                        <Icon name={link.icon} size={18} />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bool(data, "showHours", true) && contact.openingHours.length > 0 && (
              <div className="card p-6">
                <h3 className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
                  <Icon name="clock" size={14} className="text-[var(--c-accent)]" />
                  {locale === "fr" ? "Horaires" : locale === "ar" ? "ساعات العمل" : "Opening hours"}
                </h3>
                <dl className="mt-4 space-y-2.5">
                  {contact.openingHours.map((entry, index) => (
                    <div key={index} className="flex items-baseline justify-between gap-4 text-sm">
                      <dt className="text-[var(--c-muted)]">{t(entry.day, locale)}</dt>
                      <dd className="font-medium text-[var(--c-text)]">{entry.hours}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* An embed URL gives a real inline map. Without one we used to render
                nothing at all, even when the school's Google Maps pin was set —
                so the one piece of location information that IS known stayed
                invisible. Fall back to a clear, labelled link to that pin. */}
            {bool(data, "showMap", true) && contact.mapEmbedUrl && (
              <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--c-border)]">
                <iframe
                  src={contact.mapEmbedUrl}
                  title={locale === "fr" ? "Carte" : locale === "ar" ? "الخريطة" : "Map"}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-64 w-full border-0"
                  allowFullScreen
                />
              </div>
            )}

            {bool(data, "showMap", true) && !contact.mapEmbedUrl && contact.mapsLink && (
              <a
                href={safeHref(contact.mapsLink)}
                target="_blank"
                rel="noopener noreferrer"
                className="card card-hover flex items-center gap-4 p-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[rgb(var(--c-accent-rgb)/0.12)] text-[var(--c-accent)]">
                  <Icon name="pin" size={22} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[var(--c-text)]">
                    {locale === "fr"
                      ? "Voir sur Google Maps"
                      : locale === "ar"
                        ? "عرض على خرائط جوجل"
                        : "View on Google Maps"}
                  </span>
                  <span className="mt-0.5 block text-sm text-[var(--c-muted)]">
                    {locale === "fr"
                      ? "Itinéraire vers le centre"
                      : locale === "ar"
                        ? "الاتجاهات إلى المركز"
                        : "Directions to the centre"}
                  </span>
                </span>
                <Icon name="arrowUpRight" size={18} className="ms-auto shrink-0 text-[var(--c-accent)]" />
              </a>
            )}
          </div>
        </Reveal>

        {showForm && (
          <Reveal direction="left" delay={0.08}>
            <DynamicForm
              slug={formSlug}
              fields={fields}
              csrfToken={csrfToken}
              locale={locale}
              successMessage={form?.successMessage ?? "Thank you! We will get back to you shortly."}
            />
          </Reveal>
        )}
      </div>
    </SectionShell>
  );
}
