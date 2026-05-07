import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/ui/section-shell";
import { siteConfig } from "@/config/site";

export function FinalCTA() {
  return (
    <SectionShell className="pb-24">
      <div className="relative overflow-hidden rounded-[40px] border border-[#c1121f]/20  from-white to-[#fff1f2] px-8 py-14 text-center shadow-[0_30px_80px_rgba(15,24,36,0.12)]">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_center,#fbd5d5,transparent_65%)] blur-3xl" />
        <div className="relative space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#c1121f]">
            Next Step
          </p>
          <h2 className="text-4xl font-semibold text-slate-900">
            Start your journey today
          </h2>
          <p className="text-base text-slate-600">
            Secure portal onboarding for teams and families, backed by regulated
            advisors.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button href={siteConfig.portalUrl} newTab>
              Access Portal
            </Button>
            <Button href="/contact" variant="secondary">
              Talk to an Advisor
            </Button>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
