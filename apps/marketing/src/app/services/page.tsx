import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { SectionShell } from "@/components/ui/section-shell";
import { siteConfig } from "@/config/site";

const services = [
  {
    title: "Strategy & Eligibility",
    items: [
      "Global intake assessment",
      "Program recommendation matrix",
      "Compliance & risk scoring",
      "Employer and family liaisons",
    ],
  },
  {
    title: "Document Command Center",
    items: [
      "Portal checklist automation",
      "Accredited translations",
      "Biometrics + medical reminders",
      "Audit-ready file packaging",
    ],
  },
  {
    title: "Submission & Advocacy",
    items: [
      "RCIC & lawyer reviews",
      "IRCC-ready submissions",
      "Status tracking dashboards",
      "Visa readiness concierge",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Enterprise immigration services built for velocity"
        description="Integrate your teams, applicants, and families inside a single transparent workflow designed for IRCC success."
      >
        <div className="flex flex-wrap gap-4">
          <Button href="/contact" variant="secondary">
            Consult an Advisor
          </Button>
          <Button href={siteConfig.portalUrl} newTab>
            Access Portal
          </Button>
        </div>
      </PageHero>
      <SectionShell className="pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-xl font-semibold text-slate-900">
                {service.title}
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                {service.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#c1121f]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionShell>
    </>
  );
}
