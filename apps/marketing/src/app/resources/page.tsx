import { PageHero } from "@/components/ui/page-hero";
import { SectionShell } from "@/components/ui/section-shell";
import { Button } from "@/components/ui/button";

const guides = [
  {
    title: "IRCC Ready Packet",
    summary:
      "Download the checklist our advisors use to package a compliant study permit application.",
  },
  {
    title: "Employer Mobility Brief",
    summary:
      "Condensed overview of LMIA, GTS, and ICT pathways for HR and mobility teams.",
  },
  {
    title: "Family Planning Toolkit",
    summary:
      "Guide spouses and dependents through visitor visas, study permits, and open work permits.",
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Guides, playbooks, and market intelligence"
        description="Access curated collateral designed for applicants, HR teams, and partner institutions."
      />
      <SectionShell className="space-y-8 pb-12">
        {guides.map((guide) => (
          <article
            key={guide.title}
            className="rounded-3xl border border-slate-200 bg-white px-6 py-6"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{guide.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{guide.summary}</p>
              </div>
              <Button variant="secondary">Download</Button>
            </div>
          </article>
        ))}
      </SectionShell>
    </>
  );
}
