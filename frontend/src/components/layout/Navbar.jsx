import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";

const Navbar = () => {
  const { user, isAuthenticated, logout, isAdmin, isStudent } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { to: "/about", label: "About" },
    { to: "/services", label: "Services" },
    { to: "/pricing", label: "Pricing" },
    { to: "/faq", label: "FAQs" },
    { to: "/contact", label: "Contact" },
  ];

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    closeMenu();
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/95 shadow-sm backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 text-primary"
            onClick={closeMenu}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  d="M4 7.5L12 3l8 4.5M4 7.5V16.5L12 21l8-4.5V7.5M4 7.5l8 4.5 8-4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 12V21"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              Immigration CRM
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-gray-600 transition hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-700">
                    Welcome, {user?.username}
                  </span>
                  {isAdmin && (
                    <Link
                      to="/admin/dashboard"
                      className="text-sm text-gray-700 transition hover:text-primary"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  {isStudent && (
                    <>
                      <Link
                        to="/student/dashboard"
                        className="text-sm text-gray-700 transition hover:text-primary"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/student/documents"
                        className="text-sm text-gray-700 transition hover:text-primary"
                      >
                        Documents
                      </Link>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button variant="primary" size="sm">
                    Login
                  </Button>
                </Link>
              )}
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 md:hidden"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="space-y-1 px-4 py-4 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition hover:bg-gray-100 hover:text-primary"
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="space-y-2 pt-2">
                <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  Signed in as {user?.username}
                </div>
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    onClick={closeMenu}
                    className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition hover:bg-gray-100 hover:text-primary"
                  >
                    Admin Dashboard
                  </Link>
                )}
                {isStudent && (
                  <>
                    <Link
                      to="/student/dashboard"
                      onClick={closeMenu}
                      className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition hover:bg-gray-100 hover:text-primary"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/student/documents"
                      onClick={closeMenu}
                      className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition hover:bg-gray-100 hover:text-primary"
                    >
                      Documents
                    </Link>
                  </>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/login" onClick={closeMenu} className="block">
                <Button variant="primary" className="w-full" size="sm">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
