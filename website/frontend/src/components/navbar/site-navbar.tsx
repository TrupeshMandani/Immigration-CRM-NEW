"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollProgress } from "@/components/ui/scroll-progress";

export function SiteNavbar() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const handler = () => {
      setSolid(window.scrollY > 48);
    };
    handler();
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "relative fixed inset-x-0 top-0 z-50 transition-all duration-500",
        solid
          ? "bg-white/95 shadow-lg shadow-slate-950/5 backdrop-blur"
          : "bg-transparent",
      )}
    >
      <nav className="flex w-full items-center justify-between px-6 py-5 md:px-10 lg:px-12 xl:px-16">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#c1121f] text-white">
            CC
          </span>
          <div className="leading-tight">
            <span className="block">Complete</span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
              CanadaVisa
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-[#c1121f]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" href="/resources">
            Resources
          </Button>
          <Button href={siteConfig.portalUrl} newTab>
            Access Portal
          </Button>
        </div>
      </nav>
      <ScrollProgress className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#c1121f] via-[#f78da7] to-[#ffd6e0] shadow-[0_0_15px_rgba(193,18,31,0.35)]" />
    </header>
  );
}
