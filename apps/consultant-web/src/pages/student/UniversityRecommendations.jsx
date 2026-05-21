import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ApplicantLayout from "../../components/layout/ApplicantLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "../../services/api";
import { Loader2 } from "lucide-react";

const defaultFilters = {
  languageTest: "IELTS",
  listeningScore: "", readingScore: "", writingScore: "", speakingScore: "",
  lastEducationLevel: "", fieldOfStudy: "",
  preferredCountry: "Canada", preferredProvince: "", preferredCity: "",
  institutionType: "", institutionOwnership: "", programDuration: "",
  intake: [], modeOfStudy: [],
  tuitionBudget: "", livingBudget: "", scholarship: "", coOpPreference: "",
  pgwpEligible: "", prFriendlyProvince: "", employmentRate: "",
  rankingMin: "", rankingMax: "", studentDiversity: "", flexibleStart: "", campusHousing: "",
};

const intakeOptions = ["Fall", "Winter", "Spring"];
const modeOptions = ["On-campus", "Online", "Hybrid"];

const sanitizeNum = (v) => {
  if (v === "" || v == null) return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const FilterField = ({ label, children }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium">{label}</label>
    {children}
  </div>
);

const inputCls = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const SelectField = ({ label, name, value, onChange, children }) => (
  <FilterField label={label}>
    <select name={name} value={value} onChange={onChange} className={inputCls}>
      {children}
    </select>
  </FilterField>
);

const NumInput = ({ label, name, value, onChange, placeholder }) => (
  <FilterField label={label}>
    <input name={name} value={value} onChange={onChange} className={inputCls} placeholder={placeholder} />
  </FilterField>
);

const MultiChips = ({ label, name, options, selected, onToggle }) => (
  <div className="space-y-2">
    <p className="text-sm font-medium">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(name, opt)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selected.includes(opt)
              ? "bg-primary text-primary-foreground"
              : "border bg-background hover:bg-muted"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────

const UniversityRecommendation = () => {
  const { user, token } = useAuth();
  const studentId = user?.id || user?._id;

  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("openai");
  const [filters, setFilters] = useState(defaultFilters);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    if (!studentId || !token) return;
    const fetch = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/recommendations/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUniversities(res.data.universities || []);
        setSource(res.data.source || "openai");
        setLastGenerated(res.data.generatedAt || null);
        if (res.data.preferences && Object.keys(res.data.preferences).length) {
          setFilters((prev) => ({ ...prev, ...res.data.preferences }));
        }
      } catch (err) {
        if (err.response?.status === 404) {
          const saved = err.response?.data?.preferences || {};
          if (Object.keys(saved).length) setFilters((prev) => ({ ...prev, ...saved }));
          setUniversities([]);
        } else {
          setError(err.response?.data?.message || "Unable to fetch recommendations.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [studentId, token]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  const handleNum = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value.replace(/[^0-9.]/g, "") }));
  };
  const toggleMulti = (name, opt) => {
    setFilters((prev) => {
      const s = new Set(prev[name] || []);
      s.has(opt) ? s.delete(opt) : s.add(opt);
      return { ...prev, [name]: Array.from(s) };
    });
  };

  const buildPayload = () => ({
    ...filters,
    tuitionBudget: sanitizeNum(filters.tuitionBudget),
    livingBudget: sanitizeNum(filters.livingBudget),
    listeningScore: sanitizeNum(filters.listeningScore),
    readingScore: sanitizeNum(filters.readingScore),
    writingScore: sanitizeNum(filters.writingScore),
    speakingScore: sanitizeNum(filters.speakingScore),
    employmentRate: sanitizeNum(filters.employmentRate),
    rankingMin: sanitizeNum(filters.rankingMin),
    rankingMax: sanitizeNum(filters.rankingMax),
  });

  const handleGenerate = async () => {
    if (!studentId || !token) return;
    setGenerating(true);
    setError("");
    try {
      const res = await api.post(
        `/recommendations/generate/${studentId}`,
        { filters: buildPayload() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data || {};
      setUniversities(data.universities || []);
      setSource(data.source || "openai");
      setLastGenerated(data.generatedAt || new Date().toISOString());
      if (data.preferences && Object.keys(data.preferences).length)
        setFilters((prev) => ({ ...prev, ...data.preferences }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate recommendations.");
    } finally {
      setGenerating(false);
    }
  };

  const summaryChips = useMemo(() => {
    const chips = [];
    if (filters.preferredCountry) chips.push(filters.preferredCountry);
    if (filters.preferredProvince) chips.push(filters.preferredProvince);
    if (filters.fieldOfStudy) chips.push(filters.fieldOfStudy);
    if (filters.programDuration) chips.push(`${filters.programDuration} program`);
    if (filters.tuitionBudget)
      chips.push(`Tuition ≤ $${Number(filters.tuitionBudget).toLocaleString()}`);
    if (filters.scholarship === "required") chips.push("Scholarship required");
    if (filters.pgwpEligible === "yes") chips.push("PGWP eligible");
    if (filters.campusHousing === "yes") chips.push("Campus housing");
    return chips;
  }, [filters]);

  return (
    <ApplicantLayout>
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI University Recommendations</h1>
            <p className="text-sm text-muted-foreground">
              Adjust the filters to personalize your matches. Your advisor can review
              and approve a school once your account is activated.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFilters(defaultFilters)} disabled={generating}>
              Reset filters
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate recommendations
            </Button>
          </div>
        </div>

        {/* Academic profile */}
        <Card>
          <CardHeader><CardTitle className="text-base">Academic profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField label="Language test" name="languageTest" value={filters.languageTest} onChange={handleInput}>
                <option value="IELTS">IELTS</option>
                <option value="TOEFL">TOEFL</option>
                <option value="PTE">PTE</option>
              </SelectField>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {["listeningScore","readingScore","writingScore","speakingScore"].map((k) => (
                <NumInput key={k} name={k} value={filters[k]} onChange={handleNum}
                  label={k.replace("Score","").replace(/^[a-z]/, (c) => c.toUpperCase())}
                  placeholder="Score" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField label="Last education level" name="lastEducationLevel" value={filters.lastEducationLevel} onChange={handleInput}>
                <option value="">Select level</option>
                <option value="high_school">High school diploma</option>
                <option value="diploma">Diploma / Associate degree</option>
                <option value="bachelors">Bachelor's degree</option>
                <option value="masters">Master's degree</option>
                <option value="phd">Doctorate / PhD</option>
              </SelectField>
              <FilterField label="Field of study / course preference">
                <input name="fieldOfStudy" value={filters.fieldOfStudy} onChange={handleInput}
                  className={inputCls} placeholder="e.g., Computer Science" />
              </FilterField>
            </div>
          </CardContent>
        </Card>

        {/* Location & institution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Location & institution</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[["preferredCountry","Preferred country"],["preferredProvince","Preferred province/state"],["preferredCity","Preferred city"]].map(([n,l]) => (
                <FilterField key={n} label={l}>
                  <input name={n} value={filters[n]} onChange={handleInput} className={inputCls} />
                </FilterField>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectField label="Institution type" name="institutionType" value={filters.institutionType} onChange={handleInput}>
                <option value="">Any</option>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="polytechnic">Polytechnic</option>
              </SelectField>
              <SelectField label="Public or private" name="institutionOwnership" value={filters.institutionOwnership} onChange={handleInput}>
                <option value="">Any</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </SelectField>
              <SelectField label="Program duration" name="programDuration" value={filters.programDuration} onChange={handleInput}>
                <option value="">Any</option>
                <option value="1_year">1 year</option>
                <option value="2_years">2 years</option>
                <option value="4_years">4 years</option>
              </SelectField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <MultiChips label="Intakes" name="intake" options={intakeOptions}
                selected={filters.intake} onToggle={toggleMulti} />
              <MultiChips label="Mode of study" name="modeOfStudy" options={modeOptions}
                selected={filters.modeOfStudy} onToggle={toggleMulti} />
            </div>
          </CardContent>
        </Card>

        {/* Budget & opportunities */}
        <Card>
          <CardHeader><CardTitle className="text-base">Budget & opportunities</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <NumInput label="Tuition budget per year (CAD)" name="tuitionBudget"
                value={filters.tuitionBudget} onChange={handleNum} placeholder="e.g., 25000" />
              <NumInput label="Living expense budget (CAD)" name="livingBudget"
                value={filters.livingBudget} onChange={handleNum} placeholder="e.g., 15000" />
              <SelectField label="Scholarship availability" name="scholarship" value={filters.scholarship} onChange={handleInput}>
                <option value="">Flexible</option>
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
                <option value="not_required">Not required</option>
              </SelectField>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectField label="Co-op / internship" name="coOpPreference" value={filters.coOpPreference} onChange={handleInput}>
                <option value="">Flexible</option>
                <option value="required">Must include co-op</option>
                <option value="preferred">Prefer with co-op</option>
                <option value="not_required">Not required</option>
              </SelectField>
              <SelectField label="PGWP eligibility" name="pgwpEligible" value={filters.pgwpEligible} onChange={handleInput}>
                <option value="">Flexible</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </SelectField>
              <SelectField label="PR-friendly province" name="prFriendlyProvince" value={filters.prFriendlyProvince} onChange={handleInput}>
                <option value="">Flexible</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </SelectField>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <NumInput label="Employment rate desired (%)" name="employmentRate"
                value={filters.employmentRate} onChange={handleNum} placeholder="e.g., 85" />
              <FilterField label="University ranking range">
                <div className="flex gap-2">
                  <input name="rankingMin" value={filters.rankingMin} onChange={handleNum}
                    className={inputCls} placeholder="Min" />
                  <input name="rankingMax" value={filters.rankingMax} onChange={handleNum}
                    className={inputCls} placeholder="Max" />
                </div>
              </FilterField>
              <SelectField label="Student diversity" name="studentDiversity" value={filters.studentDiversity} onChange={handleInput}>
                <option value="">Any</option>
                <option value="high">High diversity</option>
                <option value="medium">Medium diversity</option>
                <option value="low">Smaller international cohort</option>
              </SelectField>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField label="Program start flexibility" name="flexibleStart" value={filters.flexibleStart} onChange={handleInput}>
                <option value="">Flexible</option>
                <option value="yes">Flexible start available</option>
                <option value="no">Fixed start dates</option>
              </SelectField>
              <SelectField label="Campus housing" name="campusHousing" value={filters.campusHousing} onChange={handleInput}>
                <option value="">Flexible</option>
                <option value="yes">Required</option>
                <option value="no">Not needed</option>
              </SelectField>
            </div>
          </CardContent>
        </Card>

        {summaryChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {summaryChips.map((chip) => (
              <Badge key={chip} variant="secondary">{chip}</Badge>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
          </Card>
        ) : universities.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No recommendations yet. Adjust your filters and generate a new list.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                {source === "openai"
                  ? "These matches are powered by our AI model."
                  : "Showing curated fallback matches while AI suggestions are unavailable."}
              </span>
              {lastGenerated && (
                <span>Last generated: {new Date(lastGenerated).toLocaleString()}</span>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {universities.map((uni, idx) => (
                <Card key={`${uni.name}-${idx}`}>
                  <CardContent className="p-5 space-y-3">
                    <div>
                      <h2 className="font-semibold">{uni.name || "Unnamed Institution"}</h2>
                      <p className="text-sm text-muted-foreground">
                        {[uni.program, uni.country].filter(Boolean).join(" • ")}
                      </p>
                      {uni.degreeLevel && (
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {uni.degreeLevel}
                        </p>
                      )}
                    </div>
                    {uni.eligibilityReason && (
                      <p className="text-xs text-muted-foreground">{uni.eligibilityReason}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-medium">
                        {Number.isFinite(uni.tuitionFee)
                          ? `$${Number(uni.tuitionFee).toLocaleString()}`
                          : "Tuition N/A"}
                      </span>
                      <Badge variant="secondary">
                        {Number.isFinite(uni.aiScore)
                          ? `${Math.round(uni.aiScore * 100)}% match`
                          : "N/A"}
                      </Badge>
                    </div>
                    {uni.website && (
                      <a
                        href={uni.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Visit program →
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </ApplicantLayout>
  );
};

export default UniversityRecommendation;
