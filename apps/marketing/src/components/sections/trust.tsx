import { trustHighlights } from "@/lib/constants";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionShell } from "@/components/ui/section-shell";

export function TrustSection() {
  return (
    <SectionShell className="space-y-12">
      <SectionHeading
        label="Trust & credibility"
        title="Transparent, ethical, regulated guidance"
        description="No gimmicks. Just data-rich eligibility, documented advice, and regulated reviews for every pathway."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {trustHighlights.map((item) => (
          <article
            key={item.title}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1f2] text-[#c1121f]">
              <item.icon />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-slate-500">{item.description}</p>
          </article>
        ))}
      </div>
      <div className="rounded-3xl border border-dashed border-[#c1121f]/40 bg-[#fff5f6] p-8 text-slate-600">
        CompleteCanadaVisa follows IRCC and global privacy regulations. Every
        decision is documented and shareable with compliance, HR, and family
        stakeholders.
      </div>
    </SectionShell>
  );
}
