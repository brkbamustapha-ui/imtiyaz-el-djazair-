import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { PopupHost } from "@/components/public/PopupHost";
import { Analytics } from "@/components/public/Analytics";
import { PreviewBanner } from "@/components/public/PreviewBanner";
import { getActivePopup } from "@/server/content";
import { getSetting } from "@/lib/settings";
import { getLocale } from "@/lib/locale";
import { isPreviewMode } from "@/lib/preview";
import { t } from "@/lib/i18n";
import { MaintenanceScreen } from "@/components/public/MaintenanceScreen";
import { getCurrentUser } from "@/lib/auth";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [advanced, locale, popup, preview, user] = await Promise.all([
    getSetting("advanced"),
    getLocale(),
    getActivePopup(),
    isPreviewMode(),
    getCurrentUser(),
  ]);

  // Maintenance mode still lets a signed-in admin browse the site.
  if (advanced.maintenanceMode && !user) {
    return <MaintenanceScreen message={t(advanced.maintenanceMessage, locale)} />;
  }

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {preview && <PreviewBanner />}
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      {popup && (
        <PopupHost
          id={popup.id}
          title={popup.title}
          body={popup.body}
          imageUrl={popup.imageUrl}
          ctaLabel={popup.ctaLabel}
          ctaHref={popup.ctaHref}
          frequency={popup.frequency}
          delayMs={popup.delayMs}
        />
      )}
      <Analytics />
    </div>
  );
}
