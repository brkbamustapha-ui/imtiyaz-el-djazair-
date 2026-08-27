import Link from "next/link";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { cn, safeHref } from "@/lib/utils";
import { t, type LocalizedText } from "@/lib/i18n";
import { arr, ls, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";

type Item = {
  title: LocalizedText | string;
  description: LocalizedText | string;
  icon?: string;
  href?: string;
};

export function FeatureGridSection({ data, locale, sectionId }: SectionProps) {
  const items = arr<Item>(data, "items");
  if (items.length === 0) return null;
  const columns = str(data, "columns", "3");

  return (
    <SectionShell id={sectionId}>
      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      <RevealGroup
        className={cn(
          "mt-14 grid gap-5 sm:grid-cols-2",
          columns === "4" ? "lg:grid-cols-4" : columns === "2" ? "lg:grid-cols-2" : "lg:grid-cols-3",
        )}
      >
        {items.map((item, index) => {
          const body = (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] bg-[rgb(var(--c-primary-rgb)/0.12)] text-[var(--c-primary)]">
                <Icon name={item.icon || "star"} size={21} />
              </span>
              <h3 className="h3 mt-5">{t(item.title, locale)}</h3>
              <p className="mt-2.5 text-[0.92rem] leading-relaxed text-[var(--c-muted)]">
                {t(item.description, locale)}
              </p>
            </>
          );
          return (
            <RevealItem key={index} className="h-full">
              {item.href ? (
                <Link href={safeHref(item.href)} className="card card-hover block h-full p-7">
                  {body}
                </Link>
              ) : (
                <div className="card card-hover h-full p-7">{body}</div>
              )}
            </RevealItem>
          );
        })}
      </RevealGroup>
    </SectionShell>
  );
}
