"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  enableTopFade?: boolean;
};

export function SiteFooter({ enableTopFade }: SiteFooterProps = {}) {
  const pathname = usePathname();
  const isCollegesPage = pathname === "/colleges";
  const isProgramsPage = pathname === "/programs";
  const shouldFade = enableTopFade ?? (isCollegesPage || isProgramsPage);
  
  return (
    <footer 
      className={cn(
        "relative overflow-hidden px-6 text-sm text-slate-500 md:px-12 lg:px-20",
        // Extended padding on colleges/programs pages for larger fade area
        (isCollegesPage || isProgramsPage) ? "pt-24 pb-10" : "py-10",
        // No border on colleges/programs pages
        !(isCollegesPage || isProgramsPage) && "border-t border-slate-200"
      )}
    >
      {/* Background - extended gradient fade on colleges/programs pages (transparent top 50% → solid white bottom 50%), solid white on other pages */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 z-0",
          (isCollegesPage || isProgramsPage)
            ? "bg-linear-to-b from-transparent from-0% via-white/40 via-25% to-white to-50%"
            : "bg-white"
        )}
      />
      
      {/* Regular pages - decorative gradient overlay at top */}
      {!(isCollegesPage || isProgramsPage) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white/95 via-white/80 to-transparent backdrop-blur-md"
        />
      )}
      
      <div className="relative z-20 flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} CompleteCanadaVisa. All rights reserved.
        </p>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          Enterprise immigration collective
        </p>
      </div>
    </footer>
  );
}
