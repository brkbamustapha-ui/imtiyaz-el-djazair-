import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/** Shown only to a signed-in admin while preview mode is active. */
export function PreviewBanner() {
  return (
    <div className="sticky top-0 z-[70] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-[var(--c-accent)] px-4 py-2 text-center text-xs font-semibold text-[var(--c-on-accent)]">
      <span className="flex items-center gap-1.5">
        <Icon name="eye" size={14} />
        Preview mode — you are seeing unpublished drafts.
      </span>
      <Link href="/api/preview/exit" className="underline underline-offset-2">
        Exit preview
      </Link>
    </div>
  );
}
