import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";

const categories = [
  {
    title: "Platform & Security",
    questions: [
      {
        question: "How secure is Immigration CRM?",
        answer:
          "We employ end-to-end encryption, role-based access controls, and SOC 2 aligned infrastructure to protect your data. Regular audits and penetration tests ensure ongoing resilience.",
      },
      {
        question: "Where is data hosted?",
        answer:
          "Data is hosted in geo-redundant data centers across North America and Europe. Enterprise customers can request regional residency options.",
      },
    ],
  },
  {
    title: "Implementation",
    questions: [
      {
        question: "Do you provide training for our team?",
        answer:
          "Yes. Every plan includes live onboarding sessions, guided configuration, and access to a library of training resources tailored for admins and case managers.",
      },
      {
        question: "Can we customize workflows for specific visa categories?",
        answer:
          "Absolutely. Create templates for any case type, automate document requests, and define conditional steps to match regional requirements.",
      },
    ],
  },
  {
    title: "Support",
    questions: [
      {
        question: "What support channels are available?",
        answer:
          "Email and in-app chat support are available to all plans. Growth and Enterprise customers receive priority phone support and a dedicated success manager.",
      },
      {
        question: "Is there a downtime guarantee?",
        answer:
          "Enterprise SLAs guarantee 99.9% uptime with proactive monitoring and rapid-response escalation paths.",
      },
    ],
  },
];

const Faq = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main>
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              FAQs
            </p>
            <h1 className="mt-4 text-4xl font-bold text-gray-900 sm:text-5xl">
              Answers to your most important questions.
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              Learn how Immigration CRM supports high-performing teams. If you
              cannot find what you need, our specialists are ready to help.
            </p>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {categories.map((category) => (
                <Card key={category.title} className="border-gray-100 bg-white">
                  <Card.Body className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {category.title}
                      </h2>
                      <p className="mt-2 text-sm text-gray-500">
                        Crafted for modern immigration teams.
                      </p>
                    </div>
                    <div className="space-y-4">
                      {category.questions.map((item) => (
                        <div key={item.question} className="space-y-2">
                          <h3 className="text-sm font-semibold text-gray-800">
                            {item.question}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-900 py-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Still looking for clarity?
            </h2>
            <p className="text-lg text-gray-300">
              Share your questions and our team will respond with tailored
              guidance within one business day.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="primary" size="lg">
                Contact Support
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:text-white">
                Explore Services
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Faq;
