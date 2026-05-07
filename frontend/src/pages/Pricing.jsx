import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";

const tiers = [
  {
    name: "Starter",
    price: "$89",
    description: "Perfect for boutique immigration consultants and solo firms.",
    features: [
      "Up to 100 active cases",
      "Automated document extraction",
      "Client portal with secure messaging",
      "Standard analytics dashboards",
    ],
    cta: "Start Trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$189",
    description: "Purpose-built for expanding teams managing cross-border work.",
    features: [
      "Unlimited cases and storage",
      "Advanced workflow automation",
      "Team permissions & collaboration",
      "Priority support and onboarding",
    ],
    cta: "Book a Demo",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description:
      "Tailored implementations for global practices with complex footprints.",
    features: [
      "Dedicated success manager",
      "Custom integrations & APIs",
      "Regulatory compliance add-ons",
      "SLA-backed 24/7 coverage",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

const faqs = [
  {
    question: "Can I migrate data from my existing CRM?",
    answer:
      "Yes. Our onboarding specialists guide you through migrating clients, cases, and documents securely with minimal downtime.",
  },
  {
    question: "Do you support multi-office or franchise models?",
    answer:
      "Immigration CRM offers flexible permissions, regional reporting, and shared templates to support complex organizations.",
  },
  {
    question: "How long does implementation take?",
    answer:
      "Most teams launch within two to four weeks. Enterprise deployments include phased rollout planning to protect operations.",
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main>
        <section className="bg-gradient-to-tr from-primary via-secondary to-secondary/70 text-white">
          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Pricing
            </p>
            <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
              Transparent plans engineered for every stage of growth.
            </h1>
            <p className="mt-6 text-lg text-white/80">
              Choose the right foundation today and expand capabilities as your
              firm scales. Every plan includes secure client collaboration,
              automated document handling, and access to our support team.
            </p>
          </div>
        </section>

        <section className="-mt-20 bg-transparent pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              {tiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={`flex h-full flex-col ${
                    tier.highlight
                      ? "border-primary/40 bg-white shadow-xl ring-2 ring-primary/30"
                      : "border-gray-100 bg-white shadow-md"
                  }`}
                >
                  <Card.Body className="flex flex-1 flex-col">
                    <div>
                      <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                        {tier.name}
                      </span>
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-gray-900">
                          {tier.price}
                        </span>
                        <span className="text-sm text-gray-500">
                          {tier.price === "Custom" ? "per engagement" : "/month"}
                        </span>
                      </div>
                      <p className="mt-4 text-sm text-gray-600">
                        {tier.description}
                      </p>
                    </div>
                    <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-600">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary"></span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={tier.highlight ? "primary" : "outline"}
                      className="mt-8 w-full"
                      size="md"
                    >
                      {tier.cta}
                    </Button>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Frequently Asked
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                Everything you need to know before getting started.
              </h2>
            </div>

            <div className="space-y-6">
              {faqs.map((item) => (
                <Card key={item.question} className="border-gray-100">
                  <Card.Body>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.question}
                    </h3>
                    <p className="mt-3 text-sm text-gray-600">{item.answer}</p>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
