export const siteConfig = {
  name: "CompleteCanadaVisa",
  description:
    "Enterprise-grade immigration programs that guide students, workers, and families to Canada.",
  nav: [
    { href: "/services", label: "Services" },
    { href: "/programs", label: "Programs" },
    { href: "/colleges", label: "Colleges" },
    { href: "/promotions", label: "Promotions" },
    { href: "/resources", label: "Resources" },
  ],
  portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.completecanadavisa.com",
};

export type SiteRoute = (typeof siteConfig.nav)[number];
