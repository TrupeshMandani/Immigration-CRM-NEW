export const CASE_TYPE_LABELS = {
  express_entry:      "Express Entry",
  pnp:                "PNP",
  family_sponsorship: "Family Sponsorship",
  work_permit:        "Work Permit",
  lmia:               "LMIA",
  study_permit:       "Study Permit",
  pgwp:               "PGWP",
  visitor_visa:       "Visitor Visa",
  citizenship:        "Citizenship",
  refugee_asylum:     "Refugee / Asylum",
  hc:                 "H&C",
};

const TYPE_STYLES = {
  express_entry:      "bg-sky-100 text-sky-700",
  pnp:                "bg-indigo-100 text-indigo-700",
  family_sponsorship: "bg-pink-100 text-pink-700",
  work_permit:        "bg-orange-100 text-orange-700",
  lmia:               "bg-amber-100 text-amber-700",
  study_permit:       "bg-teal-100 text-teal-700",
  pgwp:               "bg-cyan-100 text-cyan-700",
  visitor_visa:       "bg-violet-100 text-violet-700",
  citizenship:        "bg-green-100 text-green-700",
  refugee_asylum:     "bg-red-100 text-red-700",
  hc:                 "bg-rose-100 text-rose-700",
};

export function CaseTypeBadge({ caseType }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        TYPE_STYLES[caseType] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {CASE_TYPE_LABELS[caseType] ?? caseType}
    </span>
  );
}

export default CaseTypeBadge;
