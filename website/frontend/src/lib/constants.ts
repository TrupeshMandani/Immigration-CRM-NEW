import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";

export type PromotionFilter = "IT" | "Business" | "Healthcare" | "Trades";

export type PromotionCard = {
  id: string;
  college: string;
  program: string;
  intake: "Jan" | "May" | "Sep";
  filter: PromotionFilter;
  logo: string;
  highlight: string;
};

export const promotionFilters: PromotionFilter[] = [
  "IT",
  "Business",
  "Healthcare",
  "Trades",
];

export const promotionCards: PromotionCard[] = [
  {
    id: "maple-tech",
    college: "Maple Ridge Tech",
    program: "AI Product Leadership",
    intake: "Sep",
    filter: "IT",
    logo: "/logos/maple.svg",
    highlight: "STEM-designated, co-op embedded",
  },
  {
    id: "northbay",
    college: "NorthBay University",
    program: "Global Business Analytics",
    intake: "Jan",
    filter: "Business",
    logo: "/logos/northbay.svg",
    highlight: "Fast-track to PGWP",
  },
  {
    id: "aurora",
    college: "Aurora Health Institute",
    program: "Clinical Research Bridge",
    intake: "May",
    filter: "Healthcare",
    logo: "/logos/aurora.svg",
    highlight: "Clinical placement guaranteed",
  },
  {
    id: "forge",
    college: "Forge Trades College",
    program: "Sustainable Construction Tech",
    intake: "Sep",
    filter: "Trades",
    logo: "/logos/forge.svg",
    highlight: "Union-backed apprenticeship",
  },
  {
    id: "demo",
    college: "Your Institution",
    program: "Your promotion could appear here",
    intake: "Jan",
    filter: "Business",
    logo: "/logos/placeholder.svg",
    highlight: "Partner-ready marketing space",
  },
];

export type Pathway = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

export const pathways: Pathway[] = [
  {
    id: "study",
    title: "Study Pathways",
    description:
      "Curated study permits with partner colleges, scholarships, and PGWP strategies.",
    icon: GraduationCap,
    href: "/services",
  },
  {
    id: "work",
    title: "Work Permits",
    description:
      "Employer-driven LMIA, GTS, and intra-company transfers coordinated with HR teams.",
    icon: Briefcase,
    href: "/services",
  },
  {
    id: "pr",
    title: "Permanent Residence",
    description:
      "Express Entry, PNP, and tailored PR roadmaps based on data-backed eligibility.",
    icon: ShieldCheck,
    href: "/services",
  },
  {
    id: "visit",
    title: "Visit & Exploratory",
    description:
      "Business visits, spousal travel, and soft-landing programs with concierge support.",
    icon: Users,
    href: "/contact",
  },
];

export const processSteps = [
  {
    title: "Eligibility Launch",
    description:
      "Unified intake plus AI risk checks to validate success probability and compliance.",
  },
  {
    title: "Document Command",
    description:
      "Encrypted checklist, biometric reminders, and advisor annotations in real time.",
  },
  {
    title: "Application Tracking",
    description:
      "Portal-connected submissions with milestone alerts and analytics dashboards.",
  },
];

export const trustHighlights = [
  {
    title: "Transparent Fees",
    description: "Upfront scope, milestone billing, and shareable invoices.",
    icon: FileText,
  },
  {
    title: "Regulated Partners",
    description: "RCIC, CAPIC, and lawyer-backed reviews on every file.",
    icon: ShieldCheck,
  },
  {
    title: "Global Back Office",
    description: "Follow-the-sun support for students, HR teams, and families.",
    icon: Building2,
  },
];
