"use client";

import { useMemo } from "react";
import { colleges, collegeToPromotionCard } from "@/lib/colleges";
import { SectionShell } from "@/components/ui/section-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { PromotionCard } from "@/components/cards/promotion-card";
import { Marquee } from "@/components/ui/marquee";

export function CollegeShowcase() {
  // Convert colleges to promotion card format
  const collegeCards = useMemo(
    () => colleges.map(collegeToPromotionCard),
    []
  );

  return (
    <SectionShell className="space-y-10">
      <SectionHeading
        label="College promotions"
        title="Partner programs showcased in real-time"
        description="Explore our partner institutions across Canada with continuous program showcases."
      />

      <div className="relative overflow-hidden">
        <Marquee
          className="py-6 [--gap:2rem] [--duration:32s]"
          pauseOnHover
          repeat={3}
        >
          {collegeCards.map((card) => (
            <div key={card.id} className="shrink-0 flex items-stretch">
              <PromotionCard data={card} />
            </div>
          ))}
        </Marquee>
        
        {/* Left side gradient fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white/70 via-white/40 to-transparent"
        />
        
        {/* Right side gradient fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white/70 via-white/40 to-transparent"
        />
      </div>
    </SectionShell>
  );
}
