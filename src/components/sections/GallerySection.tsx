import { lt } from "@/lib/localized-field";
import { getGallery } from "@/server/content";
import { GalleryGrid } from "@/components/public/Lightbox";
import { Reveal } from "@/components/ui/Reveal";
import { ls, num, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";

export async function GallerySection({ data, locale, sectionId }: SectionProps) {
  const album = str(data, "album").trim();
  const items = await getGallery(album || undefined, num(data, "limit", 12));
  if (items.length === 0) return null;

  return (
    <SectionShell id={sectionId} tone="surface">
      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />
      <Reveal className="mt-12">
        <GalleryGrid
          images={items.map((item) => ({
            id: item.id,
            url: item.imageUrl,
            title: lt(item.title, locale),
            album: item.album,
          }))}
        />
      </Reveal>
    </SectionShell>
  );
}
