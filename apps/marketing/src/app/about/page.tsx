import { PageHero } from "@/components/ui/page-hero";
import { SectionShell } from "@/components/ui/section-shell";

const milestones = [
  { year: "2016", text: "Launched CompleteCanadaVisa to simplify study permits." },
  { year: "2019", text: "Expanded to talent mobility for enterprise employers." },
  { year: "2022", text: "Introduced the unified CRM portal for partners and families." },
  { year: "2024", text: "Aceternity UI refresh for marketing + onboarding experiences." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="We design confident arrivals to Canada"
        description="Our team of regulated advisors, product designers, and operations leaders orchestrates immigration journeys across continents."
      />
      <SectionShell className="space-y-12 pb-24">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
          CompleteCanadaVisa blends human advisors with automation so applicants,
          HR teams, and colleges collaborate without friction. Every workflow is
          engineered for compliance and empathy.
        </div>
        <div className="space-y-6">
          {milestones.map((milestone) => (
            <div
              key={milestone.year}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-6 md:flex-row md:items-center md:justify-between"
            >
              <p className="text-3xl font-semibold text-[#c1121f]">{milestone.year}</p>
              <p className="text-sm text-slate-600">{milestone.text}</p>
            </div>
          ))}
        </div>
      </SectionShell>
    </>
  );
}
