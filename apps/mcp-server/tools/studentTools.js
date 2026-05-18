const {
  getStudentById,
  searchStudents,
  getMissingDocuments,
  updateStudentStage,
  addNote,
  getStudentOverview,
} = require("../services/student.service");

module.exports = {
  getStudentById: {
    description: "Retrieve a single student record by internal identifier.",
    args: {
      type: "object",
      properties: {
        studentId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchStudents first.",
        },
      },
      required: ["studentId"],
    },
    run: async ({ studentId }) => {
      return await getStudentById(studentId);
    },
  },

  searchStudents: {
    description: "Search for students using a keyword query.",
    args: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Keyword used to match against student records. Leave blank to list all students.",
        },
      },
    },
    run: async ({ query }) => {
      return await searchStudents(query);
    },
  },

  getStudentMissingDocuments: {
    description: "List outstanding documents required from a student.",
    args: {
      type: "object",
      properties: {
        studentId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchStudents first.",
        },
      },
      required: ["studentId"],
    },
    run: async ({ studentId }) => {
      return await getMissingDocuments(studentId);
    },
  },

  updateStudentStage: {
    description: "Update the workflow stage for a student.",
    args: {
      type: "object",
      properties: {
        studentId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchStudents first.",
        },
        newStage: {
          type: "string",
          description: "New stage value to assign to the student.",
        },
      },
      required: ["studentId", "newStage"],
    },
    run: async ({ studentId, newStage }) => {
      return await updateStudentStage(studentId, newStage);
    },
  },

  addStudentNote: {
    description: "Attach a note to a student profile.",
    args: {
      type: "object",
      properties: {
        studentId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchStudents first.",
        },
        noteText: {
          type: "string",
          description: "Content of the note to append to the student record.",
        },
      },
      required: ["studentId", "noteText"],
    },
    run: async ({ studentId, noteText }) => {
      return await addNote(studentId, noteText);
    },
  },

  getStudentOverview: {
    description: "Return a consolidated overview of a student's progress.",
    args: {
      type: "object",
      properties: {
        studentId: {
          type: "string",
          description: "The student's internal Postgres UUID (not the aiKey). Obtain from searchStudents first.",
        },
      },
      required: ["studentId"],
    },
    run: async ({ studentId }) => {
      return await getStudentOverview(studentId);
    },
  },
};
