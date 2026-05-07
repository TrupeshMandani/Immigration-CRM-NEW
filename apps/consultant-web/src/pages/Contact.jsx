import { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { contactService } from "../services/authService";

const contactInfo = [
  {
    label: "Email",
    value: "support@immigrationcrm.com",
    description: "Our team responds within one business day.",
    icon: (
      <svg
        className="h-5 w-5 text-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    label: "Phone",
    value: "+1 (888) 320-4550",
    description: "Available Monday through Friday, 8am–6pm EST.",
    icon: (
      <svg
        className="h-5 w-5 text-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 5a2 2 0 012-2h2.28a1 1 0 01.96.72l1.16 4.07a1 1 0 01-.54 1.19l-1.3.65c1.13 2.27 2.97 4.1 5.24 5.24l.65-1.3a1 1 0 011.19-.54l4.07 1.16a1 1 0 01.72.96V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V5z"
        />
      </svg>
    ),
  },
  {
    label: "Offices",
    value: "Toronto · New York · London",
    description: "Global teams delivering regional expertise.",
    icon: (
      <svg
        className="h-5 w-5 text-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 11c1.38 0 2.5-1.12 2.5-2.5S13.38 6 12 6s-2.5 1.12-2.5 2.5S10.62 11 12 11z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 22s7-5.33 7-12a7 7 0 10-14 0c0 6.67 7 12 7 12z"
        />
      </svg>
    ),
  },
];

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      await contactService.submitContact({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim(),
      });

      setStatus({
        type: "success",
        message:
          "Thank you! A migration specialist will contact you shortly to review the next steps.",
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "We could not submit your request. Please try again.";
      setStatus({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main>
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Contact
            </p>
            <h1 className="mt-4 text-4xl font-bold text-gray-900 sm:text-5xl">
              We are here to guide your immigration journey.
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              Share your details and our counsellors will reach out to explain
              how your visa application will be managed inside Immigration CRM.
            </p>
          </div>
        </section>

        <section className="-mt-12 pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <Card className="lg:col-span-1 border-gray-100 bg-white shadow-md">
                <Card.Body className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Talk with our counsellors
                  </h2>
                  <p className="text-sm text-gray-600">
                    Share your study or work plans and we&apos;ll outline how
                    Immigration CRM keeps every step of your visa process on
                    track.
                  </p>
                  <ul className="space-y-5 text-sm text-gray-600">
                    {contactInfo.map((item) => (
                      <li key={item.label} className="flex gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm text-primary">
                            {item.value}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>

              <Card className="lg:col-span-2 border-gray-100 bg-white shadow-lg">
                <Card.Body>
                  <form
                    className="grid gap-6 md:grid-cols-2"
                    onSubmit={handleSubmit}
                  >
                    <div className="md:col-span-1">
                      <label
                        htmlFor="contact-name"
                        className="block text-sm font-semibold text-gray-700"
                      >
                        Full Name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        autoComplete="name"
                        placeholder="Jane Doe"
                        className="mt-2 w-full rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label
                        htmlFor="contact-email"
                        className="block text-sm font-semibold text-gray-700"
                      >
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="mt-2 w-full rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label
                        htmlFor="contact-phone"
                        className="block text-sm font-semibold text-gray-700"
                      >
                        Phone (optional)
                      </label>
                      <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        autoComplete="tel"
                        placeholder="+1 555 123 4567"
                        className="mt-2 w-full rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label
                        htmlFor="contact-message"
                        className="block text-sm font-semibold text-gray-700"
                      >
                        How can we support your application? (optional)
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Let us know the study, work, or travel visa you are preparing for."
                        className="mt-2 w-full rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      ></textarea>
                    </div>

                    {status.message && (
                      <div
                        className={`md:col-span-2 rounded-md border px-4 py-3 text-sm ${
                          status.type === "success"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {status.message}
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={submitting}
                        disabled={submitting}
                      >
                        Submit Request
                      </Button>
                    </div>
                  </form>
                </Card.Body>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  Meet your onboarding specialists.
                </h2>
                <p className="mt-4 text-lg text-gray-300">
                  From implementation to adoption, we partner closely with your
                  team to configure workflows, migrate historical data, and
                  launch with confidence.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-white/70">
                      Average Launch Time
                    </p>
                    <p className="mt-2 text-3xl font-bold">3.2 weeks</p>
                    <p className="mt-1 text-xs text-gray-300">
                      From kickoff to live operations
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-white/70">
                      Customer Satisfaction
                    </p>
                    <p className="mt-2 text-3xl font-bold">4.8 / 5</p>
                    <p className="mt-1 text-xs text-gray-300">
                      Based on post-launch surveys
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
