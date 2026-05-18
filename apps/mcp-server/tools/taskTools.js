const {
  getStudentTasks,
  createStudentTask,
  updateStudentTask,
  deleteStudentTask,
} = require("../services/student.service");

module.exports = {
  getTasksForStudent: {
    description: "Fetch all tasks associated with a student.",
    args: {
      type: "object",
      properties: {
        studentId: {
          type: "string",
          description: "The student's aiKey (the short slug identifier, e.g. 'john-smith-abc123').",
        },
      },
      required: ["studentId"],
    },
    run: async ({ studentId }) => {
      return await getStudentTasks(studentId);
    },
  },

  createStudentTask: {
    description:
      "Create a CRM task for a student so reminders, notifications, and workflows trigger automatically.",
    args: {
      type: "object",
      properties: {
        studentId: {
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
      required: ["studentId", "title"],
    },
    run: async ({ studentId, title, description, dueDate, attachmentPath }) => {
      return await createStudentTask(studentId, {
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
        studentId: {
          type: "string",
          description: "Student identifier (aiKey).",
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
      required: ["studentId", "taskId", "status"],
    },
    run: async ({ studentId, taskId, status, notes }) => {
      return await updateStudentTask(studentId, taskId, {
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
        studentId: {
          type: "string",
          description: "Student identifier (aiKey).",
        },
        taskId: {
          type: "string",
          description: "Task ID to delete.",
        },
      },
      required: ["studentId", "taskId"],
    },
    run: async ({ studentId, taskId }) => {
      return await deleteStudentTask(studentId, taskId);
    },
  },
};
