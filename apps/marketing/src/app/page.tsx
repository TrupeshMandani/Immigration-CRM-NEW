import { Hero } from "@/components/hero/hero";
import { CollegeShowcase } from "@/components/sections/college-showcase";
import { FinalCTA } from "@/components/sections/final-cta";
import { PathwaysGrid } from "@/components/sections/pathways-grid";
import { ProcessFlow } from "@/components/sections/process-flow";
import { TrustSection } from "@/components/sections/trust";

export default function Home() {
  return (
    <div className="relative flex flex-col gap-12 md:gap-16 bg-white text-slate-900">
      <Hero />
      <CollegeShowcase />
      <PathwaysGrid />
      <ProcessFlow />
      <TrustSection />
      <FinalCTA />
    </div>
  );
}
