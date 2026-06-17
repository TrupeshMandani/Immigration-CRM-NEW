export const DEADLINE_TYPE_LABELS = {
  work_permit_expiry:      "Work Permit Expiry",
  study_permit_expiry:     "Study Permit Expiry",
  visitor_visa_expiry:     "Visitor Visa Expiry",
  pr_card_expiry:          "PR Card Expiry",
  passport_expiry:         "Passport Expiry",
  rfe_response:            "RFE Response Deadline",
  filing_deadline:         "Application Filing Deadline",
  biometrics_appointment:  "Biometrics Appointment",
  medical_exam:            "Medical Exam Deadline",
  interview_date:          "Interview Appointment",
  ita_expiry:              "ITA Expiry (Express Entry)",
  copr_expiry:             "COPR Expiry",
  bridging_permit_expiry:  "Bridging Open Work Permit Expiry",
  lmia_expiry:             "LMIA Validity Expiry",
  custom:                  "Custom Deadline",
};

export const DEFAULT_NOTIFICATIONS = {
  work_permit_expiry:      [90, 60, 30, 14, 7],
  study_permit_expiry:     [90, 60, 30, 14, 7],
  visitor_visa_expiry:     [60, 30, 14, 7],
  pr_card_expiry:          [180, 90, 60, 30],
  passport_expiry:         [180, 90, 30],
  rfe_response:            [30, 14, 7, 3, 1],
  filing_deadline:         [30, 14, 7, 3, 1],
  biometrics_appointment:  [14, 7, 3, 1],
  medical_exam:            [30, 14, 7],
  interview_date:          [14, 7, 3, 1],
  ita_expiry:              [14, 7, 3, 1],
  copr_expiry:             [90, 60, 30, 14],
  bridging_permit_expiry:  [60, 30, 14, 7],
  lmia_expiry:             [60, 30, 14, 7],
  custom:                  [30, 14, 7],
};

export default function DeadlineTypeLabel({ deadlineType }) {
  return <span>{DEADLINE_TYPE_LABELS[deadlineType] ?? deadlineType}</span>;
}
