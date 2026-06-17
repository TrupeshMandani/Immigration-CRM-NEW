import { SectionShell } from "@/components/ui/section-shell";
import collegesData from "./colleges-data.json";
import { CollegesExplorer } from "@/components/sections/colleges-explorer";
import DotGrid from "@/components/ui/DotGrid";

const partnerBenefits = [
  {
    title: "Pipeline Visibility",
    description:
      "Real-time dashboards show you confirmed applicants, pending documents, and forecasted arrivals.",
  },
  {
    title: "Co-marketing Content",
    description:
      "Aceternity-style promotions highlight your upcoming programs inside our hero showcase.",
  },
  {
    title: "Compliance Ready",
    description:
      "Every applicant is pre-screened with IRCC compliance, language readiness, and financial fit.",
  },
];

const showcaseMetrics = [
  { label: "Average approval rate", value: "92%" },
  { label: "Global counselor network", value: "40+" },
  { label: "Active territories", value: "18" },
];

export default function CollegesPage() {
  return (
    <div className="relative min-h-screen pb-32">
      {/* 🔵 DOT GRID BACKGROUND - Absolute behind all page content */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <DotGrid
          dotSize={3}
          gap={15}
          baseColor="#BABABA"
          activeColor="#FF0000"
          proximity={50}
          shockRadius={100}
          shockStrength={2}
          resistance={100}
          returnDuration={0.5}
        />
      </div>

      {/* 🔵 PAGE HERO - Solid white at top, fading to transparent at bottom */}
      <section className="relative z-10 w-full overflow-hidden px-6 pt-36 pb-20 md:px-10 lg:px-12 xl:px-16">
        {/* Gradient overlay: solid white at top → transparent at bottom */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-gradient-to-b from-white via-white via-60% to-transparent"
        />
        <div className="relative z-20 max-w-5xl space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#c1121f]">
            Colleges &amp; partners
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">
            Strategic partnerships for international enrollment
          </h1>
          <p className="text-lg text-slate-600">
            CompleteCanadaVisa acts as your distributed recruitment, compliance, and onboarding team.
          </p>
        </div>
      </section>

      {/* 🔵 MAIN CONTENT - Transparent background, dot grid visible */}
      <div className="relative z-10">
        {/* 🔵 BENEFITS + METRICS */}
        <SectionShell className="space-y-10 pb-12">
          <div className="grid gap-6 md:grid-cols-3">
            {partnerBenefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur-md p-6"
              >
                <h2 className="text-lg font-semibold text-slate-900">
                  {benefit.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-3xl border border-[#c1121f]/30 bg-[#fff5f6]/90 backdrop-blur-md p-8">
            <div className="grid gap-6 md:grid-cols-3">
              {showcaseMetrics.map((metric) => (
                <div key={metric.label}>
                  <p className="text-3xl font-semibold text-[#c1121f]">
                    {metric.value}
                  </p>
                  <p className="text-sm text-slate-500">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionShell>

        {/* 🔵 COLLEGES EXPLORER */}
        <SectionShell className="space-y-10 pb-32">
          <CollegesExplorer colleges={collegesData} />
        </SectionShell>
      </div>
      {/* Fade DOT grid into footer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-48 bg-gradient-to-b from-transparent via-white/70 to-white"
      />
    </div>
  );
}
