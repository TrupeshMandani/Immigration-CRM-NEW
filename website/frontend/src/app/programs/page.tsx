import { SectionShell } from "@/components/ui/section-shell";
import programsData from "./programs-data.json";
import { ProgramsExplorer } from "@/components/sections/programs-explorer";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";

const programTracks = [
  {
    title: "Innovation & Tech",
    details:
      "STEM, AI, product management, and software programs paired with PGWP and co-op pathways.",
    highlights: ["Co-op embedded", "PGWP eligible", "Cross-border hiring"],
  },
  {
    title: "Business & Finance",
    details:
      "MBA, Analytics, and Global Business diplomas aligned to employer sponsorship and Express Entry points.",
    highlights: ["Scholarship scouting", "Career summits", "Employer letters"],
  },
  {
    title: "Healthcare & Life Sciences",
    details:
      "Nursing, clinical research, and allied health bridging programs with practicum planning.",
    highlights: ["Clinical placements", "Licensing roadmaps", "Family bridging"],
  },
  {
    title: "Skilled Trades",
    details:
      "Construction tech, advanced manufacturing, and green energy trades with apprenticeship partners.",
    highlights: ["Union partnerships", "Apprenticeship hours", "Permanent residence plan"],
  },
];

export default function ProgramsPage() {
  return (
    <div className="relative min-h-screen pb-32">
      {/* Interactive grid background - Absolute behind all page content */}
      <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
        <InteractiveGridPattern
          width={48}
          height={48}
          squares={[48, 36]}
          baseColor="rgba(199, 199, 199)"
          highlightColor="rgba(193,18,31,0.65)"
        />
      </div>

      {/* Left side gradient fade overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-20 bg-gradient-to-r from-white/70 via-white/40 to-transparent"
      />

      {/* Right side gradient fade overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-20 bg-gradient-to-l from-white/70 via-white/40 to-transparent"
      />

      {/* PAGE HERO - Solid white at top, fading to transparent at bottom */}
      <section className="relative z-10 w-full overflow-hidden px-6 pt-36 pb-20 md:px-10 lg:px-12 xl:px-16">
        {/* Gradient overlay: solid white at top → transparent at bottom */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-linear-to-b from-white via-white via-60% to-transparent"
        />
        <div className="relative z-20 max-w-5xl space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#c1121f]">
            Programs
          </p>
          <h1 className="text-4xl font-semibold text-slate-900">
            Programs curated for talent, outcomes, and compliance
          </h1>
          <p className="text-lg text-slate-600">
            We design cohorts with our partner colleges so applicants land in the right city, intake, and career trajectory.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT - Transparent background, grid pattern visible */}
      <div className="relative z-10">
        <SectionShell className="space-y-8 pb-12">

           {programTracks.map((program) => (
            <article
              key={program.title}
              className="rounded-3xl border border-slate-300  bg-white/80 px-6 py-8 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_30px_70px_rgba(15,24,36,0.08)] backdrop-blur-lg"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl ">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Program Track
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {program.title}
                  </h2>
                  <p className="mt-3 text-slate-600">{program.details}</p>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {program.highlights.map((highlight) => (
                    <li key={highlight} className="rounded-full border border-white/40 bg-white/70 px-4 py-2 backdrop-blur">
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </SectionShell> 
        <SectionShell className="space-y-10 pb-32">
          <ProgramsExplorer programs={programsData} />
        </SectionShell>
      </div>
      {/* Fade grid into the footer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-48 bg-gradient-to-b from-transparent via-white/70 to-white"
      />
    </div>
  );
}
