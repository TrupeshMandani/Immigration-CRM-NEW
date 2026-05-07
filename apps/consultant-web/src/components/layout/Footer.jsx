import { Link } from "react-router-dom";

const Footer = () => {
  const navigation = [
    {
      title: "Company",
      links: [
        { label: "About", to: "/about" },
        { label: "Services", to: "/services" },
        { label: "Pricing", to: "/pricing" },
        { label: "Contact", to: "/contact" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "FAQs", to: "/faq" },
        { label: "Student Portal", to: "/student/dashboard" },
        { label: "Admin Portal", to: "/admin/dashboard" },
        { label: "Support", to: "/contact" },
      ],
    },
  ];

  const social = [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com",
      icon: (
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M6.94 6.5a1.74 1.74 0 11-3.48 0 1.74 1.74 0 013.48 0zM6.75 9H3.5v9.5h3.25V9zm5.75 0H9.5v9.5h3V14.5c0-1.3.84-2.1 1.94-2.1s1.81.74 1.81 2.09V18.5H19V14c0-2.86-1.53-4.18-3.58-4.18-1.66 0-2.39.91-2.82 1.55h-.1V9z" />
        </svg>
      ),
    },
    {
      label: "Twitter",
      href: "https://www.twitter.com",
      icon: (
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M20.8 7.5c.7-.5 1.2-1 1.6-1.7-.7.3-1.4.6-2.1.7a3.6 3.6 0 00-6.3 2.4c0 .3 0 .6.1.8-3-.2-5.6-1.7-7.4-4-.3.6-.5 1.2-.5 1.9 0 1.2.6 2.3 1.6 3-.6 0-1.1-.2-1.6-.4 0 1.7 1.2 3.2 2.8 3.5-.3.1-.7.2-1 .2-.2 0-.5 0-.7-.1.5 1.4 1.8 2.3 3.4 2.3a7.3 7.3 0 01-4.6 1.6h-.8A10.1 10.1 0 0012 21c6.6 0 10.2-5.5 10.2-10.2v-.5c.7-.4 1.2-.9 1.6-1.5-.6.2-1.2.4-1.8.5z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 lg:grid-cols-4">
          <div>
            <h3 className="text-2xl font-semibold text-white">
              Immigration CRM
            </h3>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              Deliver exceptional immigration consulting experiences with AI
              powered document processing, collaborative workflows, and
              real-time analytics built for modern teams.
            </p>
            <div className="mt-6 flex items-center space-x-4">
              {social.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-primary hover:text-white"
                >
                  <span className="sr-only">{item.label}</span>
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {navigation.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-gray-300 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-1">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Stay up to date
            </h4>
            <p className="mt-4 text-sm text-gray-400">
              Subscribe to receive product news, immigration trends, and
              workflow tips.
            </p>
            <form className="mt-6 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                placeholder="Email address"
                className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-sm text-gray-500">
          © {new Date().getFullYear()} Immigration CRM. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
