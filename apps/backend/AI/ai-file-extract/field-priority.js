const FIELD_PRIORITY = {
  // Personal Information (Priority 1)
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

  // Contact (Priority 2)
  email: 2,
  phone: 2,
  phoneNumber: 2,
  address: 2,
  city: 2,
  state: 2,
  country: 2,
  postalCode: 2,
  zipCode: 2,

  // Education (Priority 3)
  education: 3,
  degree: 3,
  university: 3,
  college: 3,
  institution: 3,
  graduationDate: 3,
  fieldOfStudy: 3,
  major: 3,
  gpa: 3,

  // Work Experience (Priority 4)
  workExperience: 4,
  jobTitle: 4,
  company: 4,
  employer: 4,
  yearsOfExperience: 4,
  occupation: 4,
  position: 4,
  salary: 4,

  // Immigration (Priority 5)
  visaType: 5,
  visaStatus: 5,
  arrivalDate: 5,
  departureDate: 5,
  immigrationStatus: 5,
  travelHistory: 5,
};

/**
 * Prioritizes profile fields based on predefined importance
 * @param {Object} profile - The profile object to prioritize
 * @returns {Object} - Prioritized profile object
 */
function prioritizeFields(profile) {
  if (!profile || typeof profile !== "object") {
    return {};
  }

  return Object.entries(profile)
    .sort(([keyA], [keyB]) => {
      const priorityA = FIELD_PRIORITY[keyA] || 999;
      const priorityB = FIELD_PRIORITY[keyB] || 999;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // If same priority, sort alphabetically
      return keyA.localeCompare(keyB);
    })
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

/**
 * Formats field name for display (converts camelCase to Title Case)
 * @param {string} fieldName - The field name to format
 * @returns {string} - Formatted field name
 */
function formatFieldName(fieldName) {
  return fieldName
    .replace(/([A-Z])/g, " $1") // Add space before capitals
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

module.exports = {
  prioritizeFields,
  formatFieldName,
  FIELD_PRIORITY,
};
