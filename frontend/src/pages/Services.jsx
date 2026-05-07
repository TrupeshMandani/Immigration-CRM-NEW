import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";

const services = [
  {
    title: "AI-Powered Intake",
    description:
      "Accelerate case onboarding with automated document parsing, smart data extraction, and configurable validation rules.",
    icon: (
      <svg
        className="h-6 w-6 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6v6h4.5M21 12A9 9 0 113 12a9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "Document Workflows",
    description:
      "Generate task assignments, share document checklists, and track outstanding requirements across every stage.",
    icon: (
      <svg
        className="h-6 w-6 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2L15 9m6 3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "Client Collaboration",
    description:
      "Secure client portal with configurable notifications, status updates, and guided document submission.",
    icon: (
      <svg
        className="h-6 w-6 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5V8l-8-5-8 5v12h5"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 20v-6a3 3 0 016 0v6"
        />
      </svg>
    ),
  },
];

const highlights = [
  {
    title: "Smart Automations",
    description:
      "Trigger next steps, alerts, and compliance checks automatically with no-code workflow builders.",
  },
  {
    title: "Insights & Analytics",
    description:
      "Monitor caseload velocity, conversion trends, and team productivity with live dashboards.",
  },
  {
    title: "Integrations",
    description:
      "Connect your tools with our API and native integrations for calendars, e-signature, and payments.",
  },
];

const Services = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main>
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Services
                </p>
                <h1 className="mt-4 text-4xl font-bold text-gray-900 sm:text-5xl">
                  Expert workflows designed around every immigration case you
                  manage.
                </h1>
                <p className="mt-6 text-lg text-gray-600">
                  Configure tailored experiences for family, business, and study
                  pathways. Our platform adapts to your practice so you can
                  deliver consistently exceptional client outcomes.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="primary" size="lg">
                    Explore Pricing
                  </Button>
                  <Button variant="outline" size="lg">
                    Book a Demo
                  </Button>
                </div>
              </div>
              <Card className="border-none bg-gradient-to-br from-primary/10 via-white to-secondary/10 shadow-xl">
                <Card.Body className="space-y-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Why teams choose Immigration CRM
                  </h2>
                  <ul className="space-y-4 text-sm text-gray-600">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary"></span>
                      <span>
                        Centralize every document, note, and timeline in a
                        single secure workspace built for distributed teams.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary"></span>
                      <span>
                        Automate mundane intake tasks while preserving the human
                        touch your clients value most.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary"></span>
                      <span>
                        Gain visibility into bottlenecks, compliance deadlines,
                        and workload distribution instantly.
                      </span>
                    </li>
                  </ul>
                </Card.Body>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-12">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  Built with powerful automation at every stage.
                </h2>
                <p className="mt-4 text-lg text-gray-300">
                  Deploy modular services or launch a fully integrated suite.
                  Each capability is purpose-built to advance cases faster and
                  keep stakeholders aligned.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {services.map((service) => (
                  <Card
                    key={service.title}
                    className="border-none bg-white/5 text-white backdrop-blur"
                  >
                    <Card.Body className="space-y-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                        {service.icon}
                      </div>
                      <h3 className="text-xl font-semibold">{service.title}</h3>
                      <p className="text-sm text-gray-300">
                        {service.description}
                      </p>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Tailored Delivery
                </p>
                <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
                  Configure layered experiences for teams and clients.
                </h2>
                <p className="mt-6 text-sm text-gray-600">
                  Activate role-specific dashboards, define granular permissions,
                  and coordinate multi-office collaboration with ease. Our
                  onboarding team helps you model your unique practice inside
                  the platform.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {highlights.map((item) => (
                  <Card key={item.title} className="border-gray-100 bg-gray-50">
                    <Card.Body>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                        {item.description}
                      </p>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Services;
