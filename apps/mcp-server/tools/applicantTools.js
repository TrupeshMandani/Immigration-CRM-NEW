const {
  getApplicantById,
  searchApplicants,
  getMissingDocuments,
  updateApplicantStage,
  addNote,
  getApplicantOverview,
} = require("../services/applicant.service");

module.exports = {
  getApplicantById: {
    description: "Retrieve a single student record by internal identifier.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
        },
      },
      required: ["applicantId"],
    },
    run: async ({ applicantId }) => {
      return await getApplicantById(applicantId);
    },
  },

  searchApplicants: {
    description: "Search for applicants using a keyword query.",
    args: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Keyword used to match against student records. Leave blank to list all applicants.",
        },
      },
    },
    run: async ({ query }) => {
      return await searchApplicants(query);
    },
  },

  getStudentMissingDocuments: {
    description: "List outstanding documents required from a student.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
        },
      },
      required: ["applicantId"],
    },
    run: async ({ applicantId }) => {
      return await getMissingDocuments(applicantId);
    },
  },

  updateApplicantStage: {
    description: "Update the workflow stage for a student.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
        },
        newStage: {
          type: "string",
          description: "New stage value to assign to the student.",
        },
      },
      required: ["applicantId", "newStage"],
    },
    run: async ({ applicantId, newStage }) => {
      return await updateApplicantStage(applicantId, newStage);
    },
  },

  addApplicantNote: {
    description: "Attach a note to a student profile.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
        },
        noteText: {
          type: "string",
          description: "Content of the note to append to the student record.",
        },
      },
      required: ["applicantId", "noteText"],
    },
    run: async ({ applicantId, noteText }) => {
      return await addNote(applicantId, noteText);
    },
  },

  getApplicantOverview: {
    description: "Return a consolidated overview of a student's progress.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
        },
      },
      required: ["applicantId"],
    },
    run: async ({ applicantId }) => {
      return await getApplicantOverview(applicantId);
    },
  },
};
