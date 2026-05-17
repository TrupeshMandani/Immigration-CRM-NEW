import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { studentService } from "../../services/authService";
import StudentLayout from "../../components/layout/StudentLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ProfileFieldDisplay from "../../components/student/ProfileFieldDisplay";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

// ── Passport helpers ──────────────────────────────────────────────────────────

const normalizeKey = (key = "") =>
  key.toString().toLowerCase().replace(/[^a-z0-9]/g, "");

const PASSPORT_KEYS = {
  fullName: ["passportfullname","passportholdername","passportname","fullname","name","givennames","holdername"],
  number: ["passportnumber","passportno","passport","documentnumber","traveldocumentnumber"],
  dateOfBirth: ["passportdateofbirth","dateofbirth","dob","birthdate"],
  expiryDate: ["passportexpirydate","passportexpiry","expirydate","expirationdate","validuntil"],
};

const normalizeDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  if (typeof value === "string") {
    const match = value.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const d = new Date(match[1]);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  return value;
};

const mapLower = (obj = {}) =>
  Object.entries(obj).reduce((acc, [k, v]) => {
    acc[normalizeKey(k)] = v;
    return acc;
  }, {});

const derivePassport = (profile = {}) => {
  const pd = profile.passportDetails || {};
  const sources = [mapLower(profile), mapLower(pd)];
  const get = (keys) => {
    const nk = keys.map(normalizeKey);
    for (const src of sources)
      for (const k of nk)
        if (src[k] !== undefined && src[k] !== null && src[k] !== "") return src[k];
    return "";
  };
  const details = {
    fullName: pd.fullName || get(PASSPORT_KEYS.fullName),
    number: pd.number || pd.passportNumber || get(PASSPORT_KEYS.number),
    dateOfBirth: pd.dateOfBirth || normalizeDate(get(PASSPORT_KEYS.dateOfBirth)),
    expiryDate: pd.expiryDate || normalizeDate(get(PASSPORT_KEYS.expiryDate)),
  };
  const hasValue = Object.values(details).some((v) => v !== undefined && v !== null && v !== "");
  if (!hasValue) return { ...details, source: "" };
  const source = pd.source || (pd.manuallyUpdated ? "manual" : "") || "ai";
  return { ...details, source };
};

const PRIORITY_MAP = {
  fullName:1,firstName:1,lastName:1,name:1,dateOfBirth:1,dob:1,nationality:1,
  passportNumber:1,passport:1,gender:1,maritalStatus:1,
  email:2,phone:2,phoneNumber:2,address:2,city:2,state:2,country:2,postalCode:2,zipCode:2,
  education:3,degree:3,university:3,college:3,institution:3,graduationDate:3,fieldOfStudy:3,major:3,gpa:3,
  workExperience:4,jobTitle:4,company:4,employer:4,yearsOfExperience:4,occupation:4,position:4,salary:4,
  visaType:5,visaStatus:5,arrivalDate:5,departureDate:5,immigrationStatus:5,travelHistory:5,
};

// ── Component ─────────────────────────────────────────────────────────────────

const StudentProfile = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    city: "", state: "", country: "",
    fieldOfStudy: "", goals: "",
    passportFullName: "", passportNumber: "",
    passportDob: "", passportExpiry: "", passportSource: "",
  });

  const prioritizedProfileEntries = useMemo(() => {
    if (!student?.profile || typeof student.profile !== "object") return [];
    return Object.entries(student.profile)
      .filter(([k]) => k !== "passportDetails")
      .sort(([a], [b]) => {
        const pa = PRIORITY_MAP[a] ?? 999;
        const pb = PRIORITY_MAP[b] ?? 999;
        return pa !== pb ? pa - pb : a.localeCompare(b);
      })
      .filter(([, v]) => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "");
  }, [student?.profile]);

  const fetchStudentData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      if (!user?.aiKey) {
        toast.error("Unable to load profile without an account identifier.");
        return;
      }

      const data = await studentService.getStudentByKey(user.aiKey);
      setStudent(data);
      const contact = data?.contactInfo || {};
      const profile = data?.profile || {};
      const passport = derivePassport(profile);

      setForm({
        name: contact.name || "",
        email: contact.email || data.email || "",
        phone: contact.phone || "",
        city: profile.city || "",
        state: profile.state || "",
        country: profile.country || "",
        fieldOfStudy: profile.fieldOfStudy || "",
        goals: profile.academicGoals || profile.goals || "",
        passportFullName: passport.fullName || "",
        passportNumber: passport.number || "",
        passportDob: passport.dateOfBirth || "",
        passportExpiry: passport.expiryDate || "",
        passportSource: passport.source || "",
      });

      if (showRefresh) toast.success("Profile refreshed.");
    } catch {
      toast.error("Failed to load profile data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.aiKey]);

  useEffect(() => { fetchStudentData(); }, [fetchStudentData]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "profile_updated" && e.newValue) {
        fetchStudentData(true);
        localStorage.removeItem("profile_updated");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchStudentData]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePassport = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value, passportSource: "manual" }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const missing = ["passportFullName","passportNumber","passportDob","passportExpiry"]
      .find((f) => !form[f]?.toString().trim());
    if (missing) {
      toast.error("Please complete all passport fields before saving.");
      return;
    }
    setSaving(true);
    try {
      await studentService.updateSelfProfile({
        contactInfo: { name: form.name, email: form.email, phone: form.phone },
        profile: {
          city: form.city, state: form.state, country: form.country,
          fieldOfStudy: form.fieldOfStudy, academicGoals: form.goals,
          passportDetails: {
            fullName: form.passportFullName.trim(),
            number: form.passportNumber.trim(),
            dateOfBirth: form.passportDob,
            expiryDate: form.passportExpiry,
          },
        },
      });
      toast.success("Profile updated successfully.");
      setForm((prev) => ({ ...prev, passportSource: "manual" }));
      await fetchStudentData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save your profile at this time.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage your immigration information.
          </p>
        </div>

        <div className="space-y-6">
          {/* ── Editable form ── */}
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Update your basics</CardTitle>
                <CardDescription>
                  Keep your personal details current so advisors can review quickly.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchStudentData(true)}
                disabled={refreshing || saving}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </CardHeader>

            <CardContent>
              <form id="profile-form" className="space-y-6" onSubmit={handleSave}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" name="name" value={form.name} onChange={handleInput}
                      placeholder="Your full legal name" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" name="email" value={form.email}
                      onChange={handleInput} placeholder="name@example.com" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" value={form.phone}
                      onChange={handleInput} placeholder="Primary contact number" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fieldOfStudy">Field of study / course interest</Label>
                    <Input id="fieldOfStudy" name="fieldOfStudy" value={form.fieldOfStudy}
                      onChange={handleInput} placeholder="e.g., Computer Science" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" value={form.city} onChange={handleInput} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="state">Province / State</Label>
                    <Input id="state" name="state" value={form.state} onChange={handleInput} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" name="country" value={form.country} onChange={handleInput} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="goals">Academic goals or notes</Label>
                  <Textarea id="goals" name="goals" value={form.goals} onChange={handleInput}
                    rows={3} placeholder="Share your goals, target programs, or any constraints." />
                </div>

                {/* Passport section */}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">Passport details</p>
                      <p className="text-sm text-muted-foreground">
                        Must match your passport exactly for visa paperwork.
                      </p>
                    </div>
                    {form.passportSource === "ai" && (
                      <Badge variant="outline">Auto-filled by AI</Badge>
                    )}
                    {form.passportSource === "manual" && (
                      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                        Saved manually
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="passportFullName">Full name (as on passport)</Label>
                      <Input id="passportFullName" name="passportFullName"
                        value={form.passportFullName} onChange={handlePassport}
                        placeholder="e.g., TRUPESH MANDANI" required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="passportNumber">Passport number</Label>
                      <Input id="passportNumber" name="passportNumber"
                        value={form.passportNumber} onChange={handlePassport}
                        className="uppercase tracking-wide" placeholder="Enter passport number" required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="passportDob">Date of birth</Label>
                      <Input id="passportDob" type="date" name="passportDob"
                        value={form.passportDob} onChange={handlePassport} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="passportExpiry">Passport expiry date</Label>
                      <Input id="passportExpiry" type="date" name="passportExpiry"
                        value={form.passportExpiry} onChange={handlePassport} required />
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>

            <CardFooter className="justify-end border-t pt-4">
              <Button type="submit" form="profile-form" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </CardFooter>
          </Card>

          {/* ── Contact info ── */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              {student?.contactInfo ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <ProfileField label="Full Name" value={student.contactInfo.name || "Not provided"} />
                  <ProfileField label="Email" value={student.contactInfo.email || "Not provided"} />
                  <ProfileField label="Phone" value={student.contactInfo.phone || "Not provided"} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <Badge
                      className="mt-1"
                      variant={student.status === "active" ? "default" : "secondary"}
                    >
                      {student.status
                        ? student.status.charAt(0).toUpperCase() + student.status.slice(1)
                        : "Unknown"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No contact information available.</p>
              )}
            </CardContent>
          </Card>

          {/* ── AI extracted profile ── */}
          <Card>
            <CardHeader>
              <CardTitle>AI Extracted Information</CardTitle>
              <CardDescription>
                Automatically extracted from your uploaded documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prioritizedProfileEntries.length ? (
                <dl className="divide-y">
                  {prioritizedProfileEntries.map(([key, value]) => (
                    <ProfileFieldDisplay key={key} label={key} value={value} />
                  ))}
                </dl>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium">No profile data</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload your documents to get started with AI processing.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Account info ── */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <ProfileField label="Username" value={user?.username || "Unknown"} />
                <ProfileField label="Student ID" value={student?.aiKey || "Unknown"} />
                <ProfileField
                  label="Account Created"
                  value={student?.createdAt ? new Date(student.createdAt).toLocaleDateString() : "Unknown"}
                />
                <ProfileField
                  label="Last Updated"
                  value={student?.updatedAt ? new Date(student.updatedAt).toLocaleDateString() : "Unknown"}
                />
              </div>
            </CardContent>
            <CardFooter className="gap-3 border-t pt-4">
              <Button asChild variant="outline">
                <Link to="/student/change-password">Change Password</Link>
              </Button>
              <Button variant="outline" onClick={() => fetchStudentData(true)} disabled={refreshing}>
                {refreshing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Refreshing…</>
                ) : (
                  "Refresh Profile"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
};

const ProfileField = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm">{value}</p>
  </div>
);

export default StudentProfile;
