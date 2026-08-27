import type { Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  permission?: Permission;
  exact?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

/** Sidebar structure. Items the signed-in role cannot use are not rendered. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: "home", exact: true },
      { href: "/admin/builder", label: "Website Builder", icon: "layers", permission: "content.edit" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: "grid", permission: "pages.manage" },
      { href: "/admin/posts", label: "News & Events", icon: "news", permission: "content.edit" },
      { href: "/admin/services", label: "Services", icon: "book", permission: "content.edit" },
      { href: "/admin/stats", label: "Statistics", icon: "chart", permission: "content.edit" },
      { href: "/admin/testimonials", label: "Testimonials", icon: "quote", permission: "content.edit" },
      { href: "/admin/faq", label: "FAQ", icon: "help", permission: "content.edit" },
      { href: "/admin/gallery", label: "Gallery", icon: "image", permission: "content.edit" },
      { href: "/admin/partners", label: "Partners & Logos", icon: "handshake", permission: "partners.manage" },
    ],
  },
  {
    label: "Media & Forms",
    items: [
      { href: "/admin/media", label: "Media Library", icon: "folder", permission: "media.upload" },
      { href: "/admin/forms", label: "Forms & Messages", icon: "mail", permission: "forms.manage" },
      { href: "/admin/popups", label: "Popups", icon: "megaphone", permission: "popups.manage" },
    ],
  },
  {
    label: "Design & Structure",
    items: [
      { href: "/admin/appearance", label: "Appearance", icon: "palette", permission: "appearance.manage" },
      { href: "/admin/navigation", label: "Menu", icon: "list", permission: "navigation.manage" },
      { href: "/admin/footer", label: "Footer", icon: "text", permission: "navigation.manage" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/settings", label: "Site settings", icon: "settings", permission: "seo.manage" },
      { href: "/admin/seo", label: "SEO", icon: "search", permission: "seo.manage" },
      { href: "/admin/users", label: "Users & Roles", icon: "users", permission: "users.manage" },
      { href: "/admin/activity", label: "Activity log", icon: "clock", permission: "audit.view" },
      { href: "/admin/advanced", label: "Advanced", icon: "key", permission: "advanced.manage" },
    ],
  },
];
