import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Footer from "../components/layout/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-800 to-green-200 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Immigration CRM
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Streamline your immigration business with AI-powered document
              processing
            </p>
            <div className="space-x-4">
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to manage your immigration business
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8">
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">
                AI Document Processing
              </h3>
              <p className="text-gray-600">
                Upload documents and let our AI extract important information
                automatically
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 bg-success bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">Student Management</h3>
              <p className="text-gray-600">
                Manage student profiles, track progress, and maintain organized
                records
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 bg-secondary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">
                Analytics & Reports
              </h3>
              <p className="text-gray-600">
                Get insights into your business performance with detailed
                analytics
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to streamline your immigration business?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of immigration professionals who trust our platform
          </p>
          <Link to="/login">
            <Button variant="secondary" size="lg">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Landing;

