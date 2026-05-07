import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { studentService } from "../../services/authService";
import StudentLayout from "../../components/layout/StudentLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import Toast from "../../components/common/Toast";
import ProfileFieldDisplay from "../../components/student/ProfileFieldDisplay";

const normalizePassportKey = (key = "") =>
  key.toString().toLowerCase().replace(/[^a-z0-9]/g, "");

const PASSPORT_FIELD_KEYS = {
  fullName: [
    "passportfullname",
    "passportholdername",
    "passportname",
    "fullname",
    "name",
    "givennames",
    "holdername",
  ],
  number: [
    "passportnumber",
    "passportno",
    "passport",
    "documentnumber",
    "traveldocumentnumber",
  ],
  dateOfBirth: ["passportdateofbirth", "dateofbirth", "dob", "birthdate"],
  expiryDate: [
    "passportexpirydate",
    "passportexpiry",
    "expirydate",
    "expirationdate",
    "validuntil",
  ],
};

const normalizePassportDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const match = value.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const normalized = new Date(match[1]);
      if (!Number.isNaN(normalized.getTime())) {
        return normalized.toISOString().slice(0, 10);
      }
    }
  }
  return value;
};

const mapKeysToLower = (obj = {}) =>
  Object.entries(obj).reduce((acc, [key, value]) => {
    acc[normalizePassportKey(key)] = value;
    return acc;
  }, {});

const derivePassportDetailsFromProfile = (profile = {}) => {
  const passportDetails = profile.passportDetails || {};
  const sources = [mapKeysToLower(profile), mapKeysToLower(passportDetails)];

  const getValue = (keys) => {
    const normalizedKeys = keys.map(normalizePassportKey);
    for (const source of sources) {
      for (const key of normalizedKeys) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== "") {
          return value;
        }
      }
    }
    return "";
  };

  const details = {
    fullName: passportDetails.fullName || getValue(PASSPORT_FIELD_KEYS.fullName),
    number:
      passportDetails.number ||
      passportDetails.passportNumber ||
      getValue(PASSPORT_FIELD_KEYS.number),
    dateOfBirth:
      passportDetails.dateOfBirth ||
      normalizePassportDate(getValue(PASSPORT_FIELD_KEYS.dateOfBirth)),
    expiryDate:
      passportDetails.expiryDate ||
      normalizePassportDate(getValue(PASSPORT_FIELD_KEYS.expiryDate)),
  };

  const hasValue = [
    details.fullName,
    details.number,
    details.dateOfBirth,
    details.expiryDate,
  ].some((value) => value !== undefined && value !== null && value !== "");

  if (!hasValue) {
    return {
      fullName: "",
      number: "",
      dateOfBirth: "",
      expiryDate: "",
      source: "",
    };
  }

  let source = passportDetails.source || (passportDetails.manuallyUpdated ? "manual" : "");
  if (!source) {
    source = "ai";
  }
  details.source = source;

  return details;
};

const StudentProfile = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "",
    fieldOfStudy: "",
    goals: "",
    passportFullName: "",
    passportNumber: "",
    passportDob: "",
    passportExpiry: "",
    passportSource: "",
  });
  const [saving, setSaving] = useState(false);

  const prioritizedProfileEntries = useMemo(() => {
    if (!student?.profile || typeof student.profile !== "object") {
      return [];
    }

    const priorityMap = {
      fullName: 1,
      firstName: 1,
      lastName: 1,
      name: 1,
      dateOfBirth: 1,
      dob: 1,
      nationality: 1,
      passportNumber: 1,
      passport: 1,
      gender: 1,
      maritalStatus: 1,
      email: 2,
      phone: 2,
      phoneNumber: 2,
      address: 2,
      city: 2,
      state: 2,
      country: 2,
      postalCode: 2,
      zipCode: 2,
      education: 3,
      degree: 3,
      university: 3,
      college: 3,
      institution: 3,
      graduationDate: 3,
      fieldOfStudy: 3,
      major: 3,
      gpa: 3,
      workExperience: 4,
      jobTitle: 4,
      company: 4,
      employer: 4,
      yearsOfExperience: 4,
      occupation: 4,
      position: 4,
      salary: 4,
      visaType: 5,
      visaStatus: 5,
      arrivalDate: 5,
      departureDate: 5,
      immigrationStatus: 5,
      travelHistory: 5,
    };

    return Object.entries(student.profile)
      .filter(([key]) => key !== "passportDetails")
      .sort(([keyA], [keyB]) => {
        const priorityA = priorityMap[keyA] || 999;
        const priorityB = priorityMap[keyB] || 999;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return keyA.localeCompare(keyB);
      })
      .map(([key, value]) => [key, value])
      .filter(([, value]) =>
        Array.isArray(value)
          ? value.length > 0
          : value !== undefined && value !== null && value !== ""
      );
  }, [student?.profile]);

  const fetchStudentData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        if (!user?.aiKey) {
          setError("Unable to load profile without an account identifier.");
          return;
        }

        const studentData = await studentService.getStudentByKey(user.aiKey);
        setStudent(studentData);
        setError("");

        const contact = studentData?.contactInfo || {};
        const profile = studentData?.profile || {};
        const passportDetails = derivePassportDetailsFromProfile(profile);

        setForm({
          name: contact.name || "",
          email: contact.email || studentData.email || "",
          phone: contact.phone || "",
          city: profile.city || "",
          state: profile.state || "",
          country: profile.country || "",
          fieldOfStudy: profile.fieldOfStudy || "",
          goals: profile.academicGoals || profile.goals || "",
          passportFullName: passportDetails.fullName || "",
          passportNumber: passportDetails.number || "",
          passportDob: passportDetails.dateOfBirth || "",
          passportExpiry: passportDetails.expiryDate || "",
          passportSource: passportDetails.source || "",
        });

        if (showRefresh) {
          setToast({
            show: true,
            message: "Profile updated successfully!",
            type: "success",
          });
        }
      } catch (err) {
        setError("Failed to load profile data");
        console.error("Error fetching student data:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.aiKey]
  );

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Listen for storage events to detect uploads from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "profile_updated" && e.newValue) {
        fetchStudentData(true);
        localStorage.removeItem("profile_updated");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fetchStudentData]);

  const handleRefresh = () => {
    fetchStudentData(true);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePassportChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      passportSource: "manual",
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);

    const missingPassportField = [
      "passportFullName",
      "passportNumber",
      "passportDob",
      "passportExpiry",
    ].find((field) => !form[field] || !form[field].toString().trim());

    if (missingPassportField) {
      setToast({
        show: true,
        message: "Please complete all passport fields before saving.",
        type: "error",
      });
      setSaving(false);
      return;
    }

    try {
      await studentService.updateSelfProfile({
        contactInfo: {
          name: form.name,
          email: form.email,
          phone: form.phone,
        },
        profile: {
          city: form.city,
          state: form.state,
          country: form.country,
          fieldOfStudy: form.fieldOfStudy,
          academicGoals: form.goals,
          passportDetails: {
            fullName: form.passportFullName.trim(),
            number: form.passportNumber.trim(),
            dateOfBirth: form.passportDob,
            expiryDate: form.passportExpiry,
          },
        },
      });

      setToast({
        show: true,
        message: "Profile updated successfully.",
        type: "success",
      });
      setForm((prev) => ({ ...prev, passportSource: "manual" }));
      await fetchStudentData(true);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setToast({
        show: true,
        message:
          err.response?.data?.message || "Unable to save your profile at this time.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex h-96 items-center justify-center">
          <Loading size="lg" text="Loading your profile..." />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="">
          <h1 className="text-3xl font-bold text-primary-900">Your Profile</h1>
          <p className="mt-2 text-sm text-primary-600">
            View and manage your immigration information
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <Card.Header>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-primary-900">Update your basics</h2>
                  <p className="text-sm text-primary-600">
                    Keep your personal details current so advisors can review your profile quickly.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || saving}
                  loading={refreshing}
                >
                  Refresh from server
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <form className="space-y-6" onSubmit={handleSaveProfile}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-primary-800">
                      Full name
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                      placeholder="Your full legal name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-800">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleInputChange}
                      className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-800">
                      Phone
                    </label>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleInputChange}
                      className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                      placeholder="Primary contact number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-800">
                      Field of study / course interest
                    </label>
                    <input
                      name="fieldOfStudy"
                      value={form.fieldOfStudy}
                      onChange={handleInputChange}
                      className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-primary-800">
                      City
                    </label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleInputChange}
                      className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-800">
                      Province / State
                    </label>
                    <input
                      name="state"
                      value={form.state}
                      onChange={handleInputChange}
                      className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-800">
                      Country
                    </label>
                    <input
                      name="country"
                      value={form.country}
                      onChange={handleInputChange}
                      className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-800">
                    Academic goals or notes
                  </label>
                  <textarea
                    name="goals"
                    value={form.goals}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
                    placeholder="Share your goals, target programs, or any constraints you want your advisor to consider."
                  />
                </div>

                <div className="rounded-2xl border border-primary-200 bg-primary-50/50 px-4 py-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-primary-900">
                        Passport details
                      </h3>
                      <p className="text-sm text-primary-600">
                        These fields must match your passport exactly for visa paperwork.
                      </p>
                    </div>
                    {form.passportSource === "ai" ? (
                      <span className="inline-flex items-center rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-semibold text-primary-700 shadow-sm">
                        Auto-filled by AI
                      </span>
                    ) : form.passportSource === "manual" ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                        Saved manually
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-primary-800">
                        Full name (as on passport)
                      </label>
                      <input
                        name="passportFullName"
                        value={form.passportFullName}
                        onChange={handlePassportChange}
                        className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 bg-white"
                        placeholder="e.g., TRUPESH MANDANI"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-800">
                        Passport number
                      </label>
                      <input
                        name="passportNumber"
                        value={form.passportNumber}
                        onChange={handlePassportChange}
                        className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm uppercase tracking-wide text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 bg-white"
                        placeholder="Enter passport number"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-800">
                        Date of birth
                      </label>
                      <input
                        type="date"
                        name="passportDob"
                        value={form.passportDob}
                        onChange={handlePassportChange}
                        className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-800">
                        Passport expiry date
                      </label>
                      <input
                        type="date"
                        name="passportExpiry"
                        value={form.passportExpiry}
                        onChange={handlePassportChange}
                        className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 bg-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    disabled={saving}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>

          {/* Contact Information */}
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold text-primary-900">Contact Information</h2>
            </Card.Header>
            <Card.Body>
              {student?.contactInfo ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <ProfileField
                    label="Full Name"
                    value={student.contactInfo.name || "Not provided"}
                  />
                  <ProfileField
                    label="Email"
                    value={student.contactInfo.email || "Not provided"}
                  />
                  <ProfileField
                    label="Phone"
                    value={student.contactInfo.phone || "Not provided"}
                  />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                      Status
                    </p>
                    <span
                      className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {student.status?.charAt(0).toUpperCase() +
                        student.status?.slice(1)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-primary-600">
                  No contact information available
                </p>
              )}
            </Card.Body>
          </Card>

          {/* AI Extracted Profile */}
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold text-primary-900">
                AI Extracted Information
              </h2>
              <p className="text-sm text-primary-600 mt-1">
                Information automatically extracted from your uploaded documents
              </p>
            </Card.Header>
            <Card.Body>
              {prioritizedProfileEntries.length ? (
                <dl className="divide-y divide-primary-200">
                  {prioritizedProfileEntries.map(([key, value]) => (
                    <ProfileFieldDisplay key={key} label={key} value={value} />
                  ))}
                </dl>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-primary-400"
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
                  <h3 className="mt-2 text-sm font-medium text-primary-900">
                    No profile data
                  </h3>
                  <p className="mt-1 text-sm text-primary-600">
                    Upload your documents to get started with AI processing.
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Account Information */}
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold text-primary-900">Account Information</h2>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <ProfileField
                  label="Username"
                  value={user?.username || "Unknown"}
                />
                <ProfileField
                  label="Student ID"
                  value={student?.aiKey || "Unknown"}
                />
                <ProfileField
                  label="Account Created"
                  value={
                    student?.createdAt
                      ? new Date(student.createdAt).toLocaleDateString()
                      : "Unknown"
                  }
                />
                <ProfileField
                  label="Last Updated"
                  value={
                    student?.updatedAt
                      ? new Date(student.updatedAt).toLocaleDateString()
                      : "Unknown"
                  }
                />
              </div>
            </Card.Body>
            <Card.Footer>
              <div className="flex space-x-3">
                <Link to="/student/change-password">
                  <Button variant="outline">Change Password</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <>
                      <Loading size="sm" />
                      Refreshing...
                    </>
                  ) : (
                    "Refresh Profile"
                  )}
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </div>

        {error && (
          <div className="mt-8">
            <Card>
              <Card.Body>
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                  {error}
                </div>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </StudentLayout>
  );
};

const ProfileField = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
      {label}
    </p>
    <p className="mt-1 text-sm text-primary-900">{value}</p>
  </div>
);

export default StudentProfile;
