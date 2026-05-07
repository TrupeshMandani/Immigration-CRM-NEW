import { promotionCards } from "@/lib/constants";
import { PageHero } from "@/components/ui/page-hero";
import { SectionShell } from "@/components/ui/section-shell";
import { PromotionCard } from "@/components/cards/promotion-card";

export default function PromotionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Promotions"
        title="Live campaign showcase"
        description="Demonstrate how your promotion or cohort would appear across our marketing touchpoints."
      />
      <SectionShell className="pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          {promotionCards.map((card) => (
            <PromotionCard key={card.id} data={card} active={card.id === "demo"} />
          ))}
        </div>
      </SectionShell>
    </>
  );
}
