import { getFormBySlug } from "@/server/content";
import { getSetting } from "@/lib/settings";
import { ensureCsrfToken } from "@/lib/csrf";
import { parseJson } from "@/lib/json";
import { DynamicForm } from "@/components/public/DynamicForm";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { t } from "@/lib/i18n";
import { DEFAULT_CONTACT_FIELDS, type FormFieldDef } from "@/lib/forms";
import { bool, ls, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";

export async function ContactSection({ data, locale, sectionId }: SectionProps) {
  const contact = await getSetting("contact");
  const showForm = bool(data, "showForm", true);
  const formSlug = str(data, "formSlug", "contact") || "contact";
  const form = showForm ? await getFormBySlug(formSlug) : null;
  const csrfToken = showForm ? await ensureCsrfToken() : "";

  const fields = form
    ? parseJson<FormFieldDef[]>(form.fieldsJson, DEFAULT_CONTACT_FIELDS)
    : DEFAULT_CONTACT_FIELDS;

  const details = [
    contact.addressLine1 && {
      icon: "pin",
      label: locale === "fr" ? "Adresse" : locale === "ar" ? "العنوان" : "Address",
      value: [contact.addressLine1, contact.addressLine2, contact.city, contact.country]
        .filter(Boolean)
        .join(", "),
      href: contact.mapsLink || undefined,
    },
    contact.phonePrimary && {
      icon: "phone",
      label: locale === "fr" ? "Téléphone" : locale === "ar" ? "الهاتف" : "Phone",
      value: [contact.phonePrimary, contact.phoneSecondary].filter(Boolean).join(" · "),
      href: `tel:${contact.phonePrimary.replace(/\s/g, "")}`,
    },
    contact.email && {
      icon: "mail",
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
    },
  ].filter(Boolean) as { icon: string; label: string; value: string; href?: string }[];

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
                      {detail.href ? (
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
