import Link from "next/link";
import Image from "next/image";
import { getActivePartners } from "@/server/content";
import { getAllSettings } from "@/lib/settings";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { safeHref } from "@/lib/utils";
import { SiteLogo } from "./Logo";
import { getBrandLogos } from "@/lib/brand";

const SOCIAL_FIELDS = [
  { key: "facebook", icon: "facebook", label: "Facebook" },
  { key: "instagram", icon: "instagram", label: "Instagram" },
  { key: "linkedin", icon: "linkedin", label: "LinkedIn" },
  { key: "youtube", icon: "youtube", label: "YouTube" },
  { key: "tiktok", icon: "tiktok", label: "TikTok" },
  { key: "x", icon: "x", label: "X" },
  { key: "whatsapp", icon: "whatsapp", label: "WhatsApp" },
] as const;

export async function Footer() {
  const [settings, locale, partners, logos] = await Promise.all([
    getAllSettings(),
    getLocale(),
    getActivePartners(),
    getBrandLogos(),
  ]);
  const { footer, general, contact, social } = settings;

  const socials = SOCIAL_FIELDS.filter((field) => social[field.key]?.trim());

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-[var(--c-border)] bg-[var(--c-surface)]">
      <div
        aria-hidden
        className="glow-orb"
        style={{
          width: 480,
          height: 480,
          insetInlineStart: "-10%",
          bottom: "-60%",
          background: "rgb(var(--c-primary-rgb) / 0.16)",
        }}
      />

      {footer.showPartners && partners.length > 0 && (
        <div className="relative border-b border-[var(--c-border)]">
          <div className="container-x flex flex-wrap items-center justify-center gap-x-10 gap-y-6 py-8">
            {partners.slice(0, 8).map((partner) => (
              <PartnerLogo key={partner.id} name={partner.name} logoUrl={partner.logoUrl} website={partner.website} />
            ))}
          </div>
        </div>
      )}

      <div className="container-x relative grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)] lg:gap-8">
        <div className="max-w-sm">
          <SiteLogo
            src={logos.onDark ?? logos.primary}
            siteName={general.siteName}
            tagline={t(general.tagline, locale)}
            imageClassName="h-16"
          />
          <p className="mt-5 text-sm leading-relaxed text-[var(--c-muted)]">
            {t(footer.about, locale)}
          </p>

          {socials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {socials.map((field) => (
                <li key={field.key}>
                  <a
                    href={safeHref(social[field.key])}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={field.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--c-border)] text-[var(--c-muted)] transition-all hover:-translate-y-0.5 hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
                  >
                    <Icon name={field.icon} size={17} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {footer.columns.map((column) => (
          <nav key={column.id} aria-label={t(column.title, locale)}>
            <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[var(--c-text)]">
              {t(column.title, locale)}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.id}>
                  <Link
                    href={safeHref(link.href)}
                    className="text-sm text-[var(--c-muted)] transition-colors hover:text-[var(--c-accent)]"
                  >
                    {t(link.label, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="md:col-span-2 lg:col-span-1">
          <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[var(--c-text)]">
            {locale === "fr" ? "Contact" : locale === "ar" ? "اتصل بنا" : "Contact"}
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-[var(--c-muted)]">
            {contact.addressLine1 && (
              <li className="flex gap-2.5">
                <Icon name="pin" size={16} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
                <span>
                  {contact.addressLine1}
                  {contact.addressLine2 ? `, ${contact.addressLine2}` : ""}
                  <br />
                  {[contact.city, contact.country].filter(Boolean).join(", ")}
                </span>
              </li>
            )}
            {contact.phonePrimary && (
              <li className="flex gap-2.5">
                <Icon name="phone" size={16} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
                <a href={`tel:${contact.phonePrimary.replace(/\s/g, "")}`} className="hover:text-[var(--c-text)]">
                  {contact.phonePrimary}
                </a>
              </li>
            )}
            {contact.email && (
              <li className="flex gap-2.5">
                <Icon name="mail" size={16} className="mt-0.5 shrink-0 text-[var(--c-accent)]" />
                <a href={`mailto:${contact.email}`} className="break-all hover:text-[var(--c-text)]">
                  {contact.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="hairline">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-[var(--c-muted)] sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t(footer.copyright, locale)}
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {footer.bottomLinks.map((link) => (
              <li key={link.id}>
                <Link href={safeHref(link.href)} className="transition-colors hover:text-[var(--c-accent)]">
                  {t(link.label, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function PartnerLogo({
  name,
  logoUrl,
  website,
}: {
  name: string;
  logoUrl: string;
  website: string;
}) {
  // A light plate: most partner artwork is dark-on-transparent and would be
  // invisible against the footer.
  const image = (
    <span className="flex h-14 items-center rounded-[var(--radius-sm)] bg-white px-4 opacity-85 transition-opacity duration-500 hover:opacity-100">
      <Image
        src={logoUrl}
        alt={name}
        width={150}
        height={54}
        className="h-8 w-auto max-w-[140px] object-contain"
      />
    </span>
  );
  if (!website) return image;
  return (
    <a href={safeHref(website)} target="_blank" rel="noopener noreferrer" aria-label={name}>
      {image}
    </a>
  );
}
