import { PageHero } from "@/components/ui/page-hero";
import { SectionShell } from "@/components/ui/section-shell";

const stories = [
  {
    name: "Ayesha, Product Manager",
    origin: "Dubai → Toronto",
    story:
      "CompleteCanadaVisa aligned my MBA intake with my spouse’s open work permit. Every milestone was visible to our family in one portal.",
  },
  {
    name: "Jorge, Construction Lead",
    origin: "Mexico City → Calgary",
    story:
      "The trades pathway matched me with an employer sponsor and PR plan before we landed. No surprises, just clarity.",
  },
  {
    name: "Amelia, Clinical Research",
    origin: "Lagos → Vancouver",
    story:
      "My clinical placement and PGWP plan were mapped well before visa approval. Their concierge handled dependents seamlessly.",
  },
];

export default function SuccessStoriesPage() {
  return (
    <>
      <PageHero
        eyebrow="Success stories"
        title="People from every region, every pathway"
        description="Applicants, HR teams, and families rely on CompleteCanadaVisa for clarity and execution."
      />
      <SectionShell className="grid gap-6 pb-24 md:grid-cols-3">
        {stories.map((story) => (
          <article key={story.name} className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[#c1121f]">
              {story.origin}
            </p>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{story.name}</h2>
            <p className="mt-4 text-sm text-slate-600">{story.story}</p>
          </article>
        ))}
      </SectionShell>
    </>
  );
}
