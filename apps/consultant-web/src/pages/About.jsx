import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/common/Card";

const milestones = [
  {
    year: "2018",
    title: "Company Founded",
    description:
      "Immigration CRM began as a digital-first consultancy focused on simplifying complex immigration journeys.",
  },
  {
    year: "2020",
    title: "AI Automation",
    description:
      "We launched AI-assisted document processing, reducing intake times by more than 60% across partner agencies.",
  },
  {
    year: "2023",
    title: "Global Expansion",
    description:
      "Teams across four continents now rely on our workflows to deliver faster, compliant outcomes for their clients.",
  },
];

const values = [
  {
    title: "Client Trust",
    description:
      "Every workflow is designed around transparency, accountability, and measurable service excellence.",
  },
  {
    title: "Operational Velocity",
    description:
      "Automations help teams respond rapidly while preserving the human insight clients depend on.",
  },
  {
    title: "Regulatory Confidence",
    description:
      "Built-in compliance controls keep your firm aligned with evolving regulations everywhere you operate.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main>
        <section className="bg-gradient-to-br from-primary via-secondary to-primary/60 text-white">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  Our Story
                </p>
                <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
                  Powering modern immigration practices with the tools they
                  deserve.
                </h1>
                <p className="mt-6 text-lg text-white/80">
                  We enable immigration professionals to focus on high-value
                  counsel while intelligent automation handles repetitive,
                  error-prone work. Teams stay aligned, clients stay informed,
                  and every case moves forward with clarity.
                </p>
              </div>
              <Card className="bg-white/90 text-gray-900 shadow-xl backdrop-blur">
                <Card.Body className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                        Global Customers
                      </p>
                      <p className="mt-2 text-3xl font-bold">280+</p>
                      <p className="mt-1 text-sm text-gray-500">
                        Mission-driven immigration teams
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                        Processed Documents
                      </p>
                      <p className="mt-2 text-3xl font-bold">4M+</p>
                      <p className="mt-1 text-sm text-gray-500">
                        AI-assisted document extractions
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-6">
                    <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                      Customer Satisfaction
                    </p>
                    <p className="mt-2 text-3xl font-bold">97%</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Average client retention across three fiscal years
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              We believe immigration professionals deserve better tools.
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              From boutique consultants to international firms, our customers
              share the same goal: deliver timely, accurate, and reassuring
              experiences. Immigration CRM integrates advanced automation with
              thoughtful design so teams can execute with confidence.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {values.map((item) => (
              <Card key={item.title}>
                <Card.Body>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm text-gray-600">
                    {item.description}
                  </p>
                </Card.Body>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Milestones
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                Proven innovation across every stage of growth.
              </h2>
            </div>

            <div className="space-y-12">
              {milestones.map((milestone) => (
                <div
                  key={milestone.year}
                  className="relative flex flex-col gap-6 rounded-xl border border-gray-100 bg-gray-50 p-6 shadow-sm md:flex-row md:items-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {milestone.year}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {milestone.title}
                    </h3>
                    <p className="mt-3 text-sm text-gray-600">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
