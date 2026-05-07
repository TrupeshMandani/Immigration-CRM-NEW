import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import StudentLayout from "../../components/layout/StudentLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import api from "../../services/api";

const defaultFilters = {
  languageTest: "IELTS",
  listeningScore: "",
  readingScore: "",
  writingScore: "",
  speakingScore: "",
  lastEducationLevel: "",
  fieldOfStudy: "",
  preferredCountry: "Canada",
  preferredProvince: "",
  preferredCity: "",
  institutionType: "",
  institutionOwnership: "",
  programDuration: "",
  intake: [],
  modeOfStudy: [],
  tuitionBudget: "",
  livingBudget: "",
  scholarship: "",
  coOpPreference: "",
  pgwpEligible: "",
  prFriendlyProvince: "",
  employmentRate: "",
  rankingMin: "",
  rankingMax: "",
  studentDiversity: "",
  flexibleStart: "",
  campusHousing: "",
};

const intakeOptions = ["Fall", "Winter", "Spring"];
const modeOptions = ["On-campus", "Online", "Hybrid"];

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
    const fetchRecommendations = async () => {
      if (!studentId || !token) {
        return;
      }

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
          const savedPreferences = err.response?.data?.preferences || {};
          if (Object.keys(savedPreferences).length) {
            setFilters((prev) => ({ ...prev, ...savedPreferences }));
          }
          setUniversities([]);
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to fetch recommendations. Please try again later."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [studentId, token]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumericChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value.replace(/[^0-9.]/g, "") }));
  };

  const toggleMultiSelect = (name, option) => {
    setFilters((prev) => {
      const current = new Set(prev[name] || []);
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      return { ...prev, [name]: Array.from(current) };
    });
  };

  const generatePayload = () => {
    const sanitizeNumber = (value) => {
      if (value === "" || value === null || value === undefined) return "";
      const num = Number(value);
      return Number.isFinite(num) ? num : value;
    };

    return {
      ...filters,
      tuitionBudget: sanitizeNumber(filters.tuitionBudget),
      livingBudget: sanitizeNumber(filters.livingBudget),
      listeningScore: sanitizeNumber(filters.listeningScore),
      readingScore: sanitizeNumber(filters.readingScore),
      writingScore: sanitizeNumber(filters.writingScore),
      speakingScore: sanitizeNumber(filters.speakingScore),
      employmentRate: sanitizeNumber(filters.employmentRate),
      rankingMin: sanitizeNumber(filters.rankingMin),
      rankingMax: sanitizeNumber(filters.rankingMax),
    };
  };

  const handleGenerate = async () => {
    if (!studentId || !token) {
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const response = await api.post(
        `/recommendations/generate/${studentId}`,
        { filters: generatePayload() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const payload = response.data || {};
      setUniversities(payload.universities || []);
      setSource(payload.source || "openai");
      setLastGenerated(payload.generatedAt || new Date().toISOString());

      if (payload.preferences && Object.keys(payload.preferences).length) {
        setFilters((prev) => ({ ...prev, ...payload.preferences }));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to generate recommendations. Please review your filters and try again."
      );
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
    <StudentLayout>
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              🎓 AI University Recommendations
            </h1>
            <p className="text-sm text-gray-500">
              Adjust the filters to personalize your matches. Your advisor can review and approve a school once your account is activated.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilters(defaultFilters)}
              disabled={generating}
            >
              Reset filters
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleGenerate}
              loading={generating}
              disabled={generating}
            >
              Generate recommendations
            </Button>
          </div>
        </div>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Academic profile</h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Language test
                </label>
                <select
                  name="languageTest"
                  value={filters.languageTest}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="IELTS">IELTS</option>
                  <option value="TOEFL">TOEFL</option>
                  <option value="PTE">PTE</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {["listeningScore", "readingScore", "writingScore", "speakingScore"].map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700">
                    {key.replace("Score", "").replace(/^[a-z]/, (c) => c.toUpperCase())}
                  </label>
                  <input
                    name={key}
                    value={filters[key]}
                    onChange={handleNumericChange}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Score"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last education level
                </label>
                <select
                  name="lastEducationLevel"
                  value={filters.lastEducationLevel}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select level</option>
                  <option value="high_school">High school diploma</option>
                  <option value="diploma">Diploma / Associate degree</option>
                  <option value="bachelors">Bachelor's degree</option>
                  <option value="masters">Master's degree</option>
                  <option value="phd">Doctorate / PhD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Field of study / course preference
                </label>
                <input
                  name="fieldOfStudy"
                  value={filters.fieldOfStudy}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Location & institution</h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preferred country
                </label>
                <input
                  name="preferredCountry"
                  value={filters.preferredCountry}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preferred province/state
                </label>
                <input
                  name="preferredProvince"
                  value={filters.preferredProvince}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Preferred city
                </label>
                <input
                  name="preferredCity"
                  value={filters.preferredCity}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Institution type
                </label>
                <select
                  name="institutionType"
                  value={filters.institutionType}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  <option value="college">College</option>
                  <option value="university">University</option>
                  <option value="polytechnic">Polytechnic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Public or private
                </label>
                <select
                  name="institutionOwnership"
                  value={filters.institutionOwnership}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Program duration
                </label>
                <select
                  name="programDuration"
                  value={filters.programDuration}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  <option value="1_year">1 year</option>
                  <option value="2_years">2 years</option>
                  <option value="4_years">4 years</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Intakes
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {intakeOptions.map((option) => {
                    const selected = filters.intake.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleMultiSelect("intake", option)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          selected
                            ? "bg-secondary text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mode of study
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {modeOptions.map((option) => {
                    const selected = filters.modeOfStudy.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleMultiSelect("modeOfStudy", option)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          selected
                            ? "bg-secondary text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Budget & opportunities</h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tuition budget per year (CAD)
                </label>
                <input
                  name="tuitionBudget"
                  value={filters.tuitionBudget}
                  onChange={handleNumericChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., 25000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Living expense budget (CAD)
                </label>
                <input
                  name="livingBudget"
                  value={filters.livingBudget}
                  onChange={handleNumericChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., 15000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Scholarship availability
                </label>
                <select
                  name="scholarship"
                  value={filters.scholarship}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Flexible</option>
                  <option value="required">Required</option>
                  <option value="preferred">Preferred</option>
                  <option value="not_required">Not required</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Co-op / internship requirements
                </label>
                <select
                  name="coOpPreference"
                  value={filters.coOpPreference}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Flexible</option>
                  <option value="required">Must include co-op/internship</option>
                  <option value="preferred">Prefer programs with co-op</option>
                  <option value="not_required">Not required</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  PGWP eligibility
                </label>
                <select
                  name="pgwpEligible"
                  value={filters.pgwpEligible}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Flexible</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  PR-friendly province
                </label>
                <select
                  name="prFriendlyProvince"
                  value={filters.prFriendlyProvince}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Flexible</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employment rate after graduation (% desired)
                </label>
                <input
                  name="employmentRate"
                  value={filters.employmentRate}
                  onChange={handleNumericChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., 85"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  University ranking range
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    name="rankingMin"
                    value={filters.rankingMin}
                    onChange={handleNumericChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Min"
                  />
                  <input
                    name="rankingMax"
                    value={filters.rankingMax}
                    onChange={handleNumericChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Max"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Student diversity preference
                </label>
                <select
                  name="studentDiversity"
                  value={filters.studentDiversity}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Any</option>
                  <option value="high">High diversity</option>
                  <option value="medium">Medium diversity</option>
                  <option value="low">Smaller international cohort</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Program start flexibility
                </label>
                <select
                  name="flexibleStart"
                  value={filters.flexibleStart}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Flexible</option>
                  <option value="yes">Flexible start available</option>
                  <option value="no">Fixed start dates</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Campus housing availability
                </label>
                <select
                  name="campusHousing"
                  value={filters.campusHousing}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Flexible</option>
                  <option value="yes">Required</option>
                  <option value="no">Not needed</option>
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {summaryChips.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            {summaryChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-blue-50 px-3 py-1 text-blue-700"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <Card className="p-6 text-center text-gray-500">
            Loading recommendations...
          </Card>
        ) : error ? (
          <Card className="p-6 text-center text-red-600">{error}</Card>
        ) : universities.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No recommendations yet. Adjust your filters and generate a new list.
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>
                {source === "openai"
                  ? "These matches are powered by our AI model."
                  : "Showing curated fallback matches while AI suggestions are unavailable."}
              </span>
              {lastGenerated && (
                <span>
                  Last generated: {new Date(lastGenerated).toLocaleString()}
                </span>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {universities.map((uni, idx) => (
                <Card key={`${uni.name}-${idx}`} className="p-5">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {uni.name || "Unnamed Institution"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {[uni.program, uni.country].filter(Boolean).join(" • ")}
                  </p>
                  {uni.degreeLevel && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
                      {uni.degreeLevel}
                    </p>
                  )}
                  {uni.eligibilityReason && (
                    <div className="mt-2 text-xs text-gray-600">
                      {uni.eligibilityReason}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                      {Number.isFinite(uni.tuitionFee)
                        ? `💰 $${Number(uni.tuitionFee).toLocaleString()}`
                        : "Tuition N/A"}
                    </span>
                    <span className="text-blue-500 text-sm">
                      {Number.isFinite(uni.aiScore)
                        ? `${Math.round(uni.aiScore * 100)}% match`
                        : "Match score N/A"}
                    </span>
                  </div>
                  {uni.website && (
                    <a
                      href={uni.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
                    >
                      Visit program →
                    </a>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default UniversityRecommendation;
