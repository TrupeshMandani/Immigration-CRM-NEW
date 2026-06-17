import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { authService } from "../services/authService";
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
} from "firebase/auth";
import { firebaseAuth } from "../firebase/config";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [adminLoading, setAdminLoading] = useState(false);
  const [error, setError] = useState("");
  const [applicantLoading, setApplicantLoading] = useState(false);
  const [applicantError, setApplicantError] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");
  const [emailForLink, setEmailForLink] = useState("");
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);

  const { login, loginWithFirebaseToken, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailLinkHandledRef = useRef(false);
  const googlePopupPendingRef = useRef(false);
  const googlePopupRecoveryTimerRef = useRef(null);
  const firebaseAvailable = Boolean(firebaseAuth);

  // eslint-disable-next-line no-unused-vars
  const from = location.state?.from?.pathname || "/";

  const routeAfterLogin = useCallback(
    (authUser) => {
      if (!authUser) return;

      if (authUser.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (authUser.role === "applicant") {
        if (authUser.isFirstLogin) {
          navigate("/applicant/change-password", { replace: true });
        } else {
          navigate("/applicant/dashboard", { replace: true });
        }
      }
    },
    [navigate]
  );

  const clearEmailLinkFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("oobCode")) return;

    const paramsToRemove = ["oobCode", "mode", "lang", "apiKey", "continueUrl"];
    paramsToRemove.forEach((param) => url.searchParams.delete(param));

    const newSearch = url.searchParams.toString();
    const cleanedUrl = `${url.pathname}${newSearch ? `?${newSearch}` : ""}${
      url.hash
    }`;
    window.history.replaceState({}, document.title, cleanedUrl);
  }, []);

  const completeEmailLinkSignIn = useCallback(
    async (signInEmail) => {
      if (!firebaseAvailable || !firebaseAuth) {
        setApplicantError("Firebase authentication is not available.");
        return;
      }

      if (!signInEmail) {
        setApplicantError("Enter the email address you used to request access.");
        return;
      }

      console.groupCollapsed("[FirebaseEmailLink] Complete flow");
      console.debug("Email attempting link completion", signInEmail);
      setApplicantLoading(true);
      setApplicantError("");
      setApplicantMessage("Verifying your email...");

      try {
        const result = await signInWithEmailLink(
          firebaseAuth,
          signInEmail,
          window.location.href
        );
        window.localStorage.removeItem("firebaseEmailForSignIn");
        setEmailLinkSent(false);
        setAwaitingEmailConfirm(false);
        setApplicantMessage("");
        console.debug("Firebase email link sign-in success, user", result.user.uid);

        try {
          await firebaseAuth.signOut();
        } catch (signOutError) {
          console.warn("Firebase sign-out failed:", signOutError);
        }

        const idToken = await result.user.getIdToken();
        console.debug("Retrieved ID token length", idToken?.length);
        const authResult = await loginWithFirebaseToken(idToken);

        if (authResult.success) {
          console.debug("Backend accepted Firebase token", authResult.user?.id);
          routeAfterLogin(authResult.user);
        } else {
          console.error("Backend rejected Firebase token", authResult.error);
          setApplicantError(authResult.error);
        }
      } catch (err) {
        console.error("Email link sign-in failed:", err);
        setApplicantError(
          err?.message || "Unable to complete email link sign-in."
        );
        setAwaitingEmailConfirm(true);
      } finally {
        clearEmailLinkFromUrl();
        console.groupEnd();
        setApplicantLoading(false);
      }
    },
    [
      clearEmailLinkFromUrl,
      firebaseAuth,
      firebaseAvailable,
      loginWithFirebaseToken,
      routeAfterLogin,
    ]
  );

  const handleGoogleSignIn = useCallback(async () => {
    if (!firebaseAvailable || !firebaseAuth) {
      setApplicantError("Firebase authentication is not available.");
      return;
    }

    googlePopupPendingRef.current = true;
    setApplicantLoading(true);
    setApplicantError("");
    setApplicantMessage("");
    console.groupCollapsed("[FirebaseAuth] Google sign-in");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(firebaseAuth, provider);
      console.debug("Google user", result.user?.uid);
      const idToken = await result.user.getIdToken();
      console.debug("Google ID token length", idToken?.length);

      try {
        await firebaseAuth.signOut();
      } catch (err) {
        console.warn("Firebase sign-out after Google login failed:", err);
      }

      const authResult = await loginWithFirebaseToken(idToken);
      if (authResult.success) {
        console.debug("Backend accepted Google login", authResult.user?.id);
        routeAfterLogin(authResult.user);
      } else {
        console.error("Backend rejected Google login", authResult.error);
        setApplicantError(authResult.error);
      }
    } catch (err) {
      console.error("Google sign-in failed:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setApplicantMessage("Google sign-in was cancelled.");
      } else {
        setApplicantError(err?.message || "Google sign-in failed.");
      }
    } finally {
      console.groupEnd();
      googlePopupPendingRef.current = false;
      if (googlePopupRecoveryTimerRef.current) {
        clearTimeout(googlePopupRecoveryTimerRef.current);
        googlePopupRecoveryTimerRef.current = null;
      }
      setApplicantLoading(false);
    }
  }, [firebaseAuth, firebaseAvailable, loginWithFirebaseToken, routeAfterLogin]);

  const requestEmailLink = useCallback(async () => {
    if (!emailForLink) {
      setApplicantError("Enter your email address to continue.");
      return;
    }

    if (!firebaseAvailable) {
      setApplicantError("Firebase authentication is not available.");
      return;
    }

    console.groupCollapsed("[FirebaseEmailLink] Request flow");
    console.debug("Env check", {
      firebaseAvailable,
      emailForLink,
      origin: window.location.origin,
    });

    setApplicantLoading(true);
    setApplicantError("");
    setApplicantMessage("");

    try {
      clearEmailLinkFromUrl();

      const response = await authService.requestLoginLink(emailForLink);
      console.debug("Backend login link response", response);

      window.localStorage.setItem("firebaseEmailForSignIn", emailForLink);
      setEmailLinkSent(true);
      setAwaitingEmailConfirm(false);
      setApplicantMessage(
        response?.message ||
          "We've emailed you a sign-in link. Open it on this device to finish signing in."
      );
    } catch (err) {
      console.error("Email sign-in link error:", err);
      setApplicantError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to send the email sign-in link right now."
      );
    } finally {
      console.groupEnd();
      setApplicantLoading(false);
    }
  }, [clearEmailLinkFromUrl, emailForLink, firebaseAvailable]);

  const handleEmailFormSubmit = async (event) => {
    event.preventDefault();
    if (awaitingEmailConfirm) {
      await completeEmailLinkSignIn(emailForLink);
    } else {
      await requestEmailLink();
    }
  };

  const handleEmailInputChange = (event) => {
    setEmailForLink(event.target.value);
    setApplicantError("");
    setApplicantMessage("");
  };

  useEffect(() => {
    if (isAuthenticated) {
      routeAfterLogin(user);
    }
  }, [isAuthenticated, routeAfterLogin, user]);

  useEffect(() => {
    if (!firebaseAvailable || !firebaseAuth) return;
    if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) return;
    if (emailLinkHandledRef.current) return;

    emailLinkHandledRef.current = true;
    console.groupCollapsed("[FirebaseEmailLink] completion detected");
    console.debug("Location href", window.location.href);
    setEmailLinkSent(true);

    const storedEmail = window.localStorage.getItem("firebaseEmailForSignIn");
    if (storedEmail) {
      console.debug("Stored email found", storedEmail);
      setEmailForLink(storedEmail);
      completeEmailLinkSignIn(storedEmail);
    } else {
      console.warn(
        "No stored email found for email link completion; prompting user."
      );
      setEmailForLink("");
      setAwaitingEmailConfirm(true);
      setApplicantMessage(
        "Enter the email you used to request the sign-in link to finish signing in."
      );
    }
    console.groupEnd();
  }, [
    completeEmailLinkSignIn,
    firebaseAvailable,
    firebaseAuth,
  ]);

  useEffect(() => {
    const handleFocusLikeEvent = () => {
      if (!googlePopupPendingRef.current) return;

      if (googlePopupRecoveryTimerRef.current) {
        clearTimeout(googlePopupRecoveryTimerRef.current);
      }

      googlePopupRecoveryTimerRef.current = setTimeout(() => {
        if (googlePopupPendingRef.current) {
          googlePopupPendingRef.current = false;
          setApplicantLoading(false);
          setApplicantError("");
          setApplicantMessage("Google sign-in was cancelled.");
        }
      }, 400);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleFocusLikeEvent();
      }
    };

    window.addEventListener("focus", handleFocusLikeEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocusLikeEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (googlePopupRecoveryTimerRef.current) {
        clearTimeout(googlePopupRecoveryTimerRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    setError("");

    const result = await login(formData.username, formData.password);

    if (result.success) {
      routeAfterLogin(result.user);
    } else {
      setError(result.error);
    }

    setAdminLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-800 mb-2">
            Immigration CRM
          </h1>
          <h2 className="text-2xl font-bold text-primary-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-primary-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-primary-800 hover:text-primary-600"
            >
              Register now
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <Card className="py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 bg-primary-200 border border-primary-400/30">
          <div className="space-y-10">
            <section>
              <h3 className="text-lg font-semibold text-primary-900">
                Admin Access
              </h3>
              <p className="mt-1 text-sm text-primary-600">
                Use your administrator credentials to sign in.
              </p>

              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-primary-800"
                  >
                    Username or Email
                  </label>
                  <div className="mt-1">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="block w-full rounded-md border border-primary-400 px-3 py-2 text-sm shadow-sm placeholder-primary-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400/40 bg-white/50"
                      placeholder="Enter your username or email"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-primary-800"
                  >
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full rounded-md border border-primary-400 px-3 py-2 text-sm shadow-sm placeholder-primary-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400/40 bg-white/50"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={adminLoading}
                    disabled={adminLoading}
                    className="w-full"
                  >
                    Sign in
                  </Button>
                </div>
              </form>
            </section>

            <div className="relative flex items-center gap-4">
              <span className="flex-1 border-t border-primary-400/30" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-400">
                Applicant Access
              </span>
              <span className="flex-1 border-t border-primary-400/30" />
            </div>

            <section className="space-y-6">
              {applicantError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {applicantError}
                </div>
              )}

              {applicantMessage && (
                <div className="rounded-md border border-primary-400 bg-primary-200 px-4 py-3 text-sm text-primary-800">
                  {applicantMessage}
                </div>
              )}

              {!firebaseAvailable && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Firebase login is not configured yet. Please contact the
                  administrator.
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={applicantLoading || !firebaseAvailable}
                className="w-full"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </span>
              </Button>

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-primary-400">
                <span className="h-px flex-1 bg-primary-400/30" />
                <span>or</span>
                <span className="h-px flex-1 bg-primary-400/30" />
              </div>

              <form className="space-y-4" onSubmit={handleEmailFormSubmit}>
                <div>
                  <label
                    htmlFor="applicant-email"
                    className="block text-sm font-medium text-primary-800"
                  >
                    Applicant Email
                  </label>
                  <div className="mt-1">
                    <input
                      id="applicant-email"
                      type="email"
                      value={emailForLink}
                      onChange={handleEmailInputChange}
                      required
                      disabled={applicantLoading && !awaitingEmailConfirm}
                      className="block w-full rounded-md border border-primary-400 px-3 py-2 text-sm shadow-sm placeholder-primary-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400/40 bg-white/50"
                      placeholder="applicant.com"
                    />
                  </div>
                </div>

                {awaitingEmailConfirm ? (
                  <p className="text-xs text-primary-600">
                    Enter the email you used to request the login link so we can
                    finish signing you in.
                  </p>
                ) : emailLinkSent ? (
                  <p className="text-xs text-primary-600">
                    We sent a sign-in link to{" "}
                    <span className="font-medium">
                      {emailForLink || "your email"}
                    </span>
                    . Open it on this device to complete sign-in.
                  </p>
                ) : (
                  <p className="text-xs text-primary-600">
                    Request a one-time login email. No password required.
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={applicantLoading}
                  disabled={applicantLoading || !firebaseAvailable}
                  className="w-full"
                >
                  {awaitingEmailConfirm ? "Complete sign in" : "Send login email"}
                </Button>
              </form>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
