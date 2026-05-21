const {
  getStudentTasks,
  createStudentTask,
  updateStudentTask,
  deleteStudentTask,
} = require("../services/applicant.service");

module.exports = {
  getTasksForStudent: {
    description: "Fetch all tasks associated with a student.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "The student's aiKey (the short slug identifier, e.g. 'john-smith-abc123').",
        },
      },
      required: ["applicantId"],
    },
    run: async ({ applicantId }) => {
      return await getStudentTasks(applicantId);
    },
  },

  createStudentTask: {
    description:
      "Create a CRM task for a student so reminders, notifications, and workflows trigger automatically.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "Unique student identifier (aiKey) from the CRM backend.",
        },
        title: {
          type: "string",
          description: "Short title for the task (e.g., 'Upload passport').",
        },
        description: {
          type: "string",
          description: "Detailed instructions for the student.",
        },
        dueDate: {
          type: "string",
          description: "Due date in ISO format (optional).",
        },
        attachmentPath: {
          type: "string",
          description:
            "Absolute path to a local file to attach (optional; file must exist).",
        },
      },
      required: ["applicantId", "title"],
    },
    run: async ({ applicantId, title, description, dueDate, attachmentPath }) => {
      return await createStudentTask(applicantId, {
        title,
        description,
        dueDate,
        attachmentPath,
      });
    },
  },

  updateStudentTaskStatus: {
    description:
      "Update a student's task status (e.g., mark complete) using the CRM backend.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "Applicant identifier (aiKey).",
        },
        taskId: {
          type: "string",
          description: "Task ID returned by the backend.",
        },
        status: {
          type: "string",
          enum: ["open", "done"],
          description: "Backend task status. Use 'open' for pending/active tasks, 'done' for completed tasks.",
        },
        notes: {
          type: "string",
          description: "Optional notes recorded alongside the update.",
        },
      },
      required: ["applicantId", "taskId", "status"],
    },
    run: async ({ applicantId, taskId, status, notes }) => {
      return await updateStudentTask(applicantId, taskId, {
        status,
        notes,
      });
    },
  },

  deleteStudentTask: {
    description:
      "Remove a specific student task from the CRM to clean up completed/outdated work.",
    args: {
      type: "object",
      properties: {
        applicantId: {
          type: "string",
          description: "Applicant identifier (aiKey).",
        },
        taskId: {
          type: "string",
          description: "Task ID to delete.",
        },
      },
      required: ["applicantId", "taskId"],
    },
    run: async ({ applicantId, taskId }) => {
      return await deleteStudentTask(applicantId, taskId);
    },
  },
};
