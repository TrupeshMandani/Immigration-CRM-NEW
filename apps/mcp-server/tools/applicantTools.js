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
    description: "Retrieve a single applicant record by internal identifier.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The applicant's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
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
            "Keyword used to match against applicant records. Leave blank to list all applicants.",
        },
      },
    },
    run: async ({ query }) => {
      return await searchApplicants(query);
    },
  },

  getApplicantMissingDocuments: {
    description: "List outstanding documents required from an applicant.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The applicant's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
        },
      },
      required: ["applicantId"],
    },
    run: async ({ applicantId }) => {
      return await getMissingDocuments(applicantId);
    },
  },

  updateApplicantStage: {
    description: "Update the workflow stage for an applicant.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The applicant's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
        },
        newStage: {
          type: "string",
          description: "New stage value to assign to the applicant.",
        },
      },
      required: ["applicantId", "newStage"],
    },
    run: async ({ applicantId, newStage }) => {
      return await updateApplicantStage(applicantId, newStage);
    },
  },

  addApplicantNote: {
    description: "Attach a note to an applicant profile.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The applicant's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
        },
        noteText: {
          type: "string",
          description: "Content of the note to append to the applicant record.",
        },
      },
      required: ["applicantId", "noteText"],
    },
    run: async ({ applicantId, noteText }) => {
      return await addNote(applicantId, noteText);
    },
  },

  getApplicantOverview: {
    description: "Return a consolidated overview of an applicant's progress.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The applicant's internal Postgres UUID (not the aiKey). Obtain from searchApplicants first.",
        },
      },
      required: ["applicantId"],
    },
    run: async ({ applicantId }) => {
      return await getApplicantOverview(applicantId);
    },
  },
};
