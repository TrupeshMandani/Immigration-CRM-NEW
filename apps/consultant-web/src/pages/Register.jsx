import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "../components/common/Card";
import Button from "../components/common/Button";

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, user } = useAuth();

  const initialForm = {
    name: "",
    email: "",
    phone: "",
  };
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === "applicant") {
        navigate("/applicant/profile", { replace: true });
      } else if (user?.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await register(formData);

    if (result.success) {
      setSuccess(
        result.data?.message ||
          "Registration received. Check your email for the login link."
      );
      setFormData({ ...initialForm });
    } else {
      setError(result.error);
      setSuccess("");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-800 mb-2">
            Immigration CRM
          </h1>
          <h2 className="text-2xl font-bold text-primary-900">
            Create your applicant account
          </h2>
          <p className="mt-2 text-sm text-primary-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary-800 hover:text-primary-600"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 bg-primary-200 border border-primary-400/30">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {success}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-primary-800"
              >
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-primary-400 rounded-md shadow-sm placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-600 sm:text-sm bg-white/50"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-primary-800"
              >
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-primary-400 rounded-md shadow-sm placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-600 sm:text-sm bg-white/50"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-primary-800"
              >
                Phone (optional)
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-primary-400 rounded-md shadow-sm placeholder-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-600 sm:text-sm bg-white/50"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={loading}
                className="w-full"
              >
                Create Account
              </Button>
            </div>

            <p className="text-xs text-primary-600 text-center">
              After submitting, we&apos;ll email you a secure sign-in link—no
              password needed.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Register;
