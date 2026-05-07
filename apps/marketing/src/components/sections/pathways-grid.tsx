import Link from "next/link";
import { pathways } from "@/lib/constants";
import { SectionShell } from "@/components/ui/section-shell";
import { SectionHeading } from "@/components/ui/section-heading";

export function PathwaysGrid() {
  return (
    <SectionShell className="space-y-12" id="eligibility">
      <SectionHeading
        label="Pathways"
        title="Four proven routes into Canada"
        description="Your dedicated strategist orchestrates each pathway with transparent milestone tracking across the CompleteCanadaVisa portal."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {pathways.map((pathway) => (
          <Link
            key={pathway.id}
            href={pathway.href}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-2 hover:border-[#c1121f]"
          >
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#c1121f]">
                <pathway.icon />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{pathway.title}</h3>
                <p className="text-sm text-slate-500">{pathway.description}</p>
              </div>
            </div>
            <div className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 group-hover:text-[#c1121f]">
              Explore →
            </div>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}
