const Student = require("../../models/Student");

/**
 * Aggregates relevant student data into a context string for the AI.
 * @param {string} studentId - The ID of the student
 * @returns {Promise<string>} - The formatted context string
 */
async function buildStudentContext(studentId) {
  try {
    const student = await Student.findById(studentId).lean();
    if (!student) return "Student not found.";

    let context = `Student Profile:\n`;
    context += `- Name: ${student.contactInfo?.name || "N/A"}\n`;
    context += `- Email: ${student.email || "N/A"}\n`;
    context += `- Status: ${student.status}\n`;

    if (student.profile) {
      context += `\nDetailed Profile:\n${JSON.stringify(student.profile, null, 2)}\n`;
    }

    if (student.requiredDocuments && student.requiredDocuments.length > 0) {
      context += `\nDocuments Status:\n`;
      student.requiredDocuments.forEach((doc) => {
        const status = doc.isUploaded ? "Uploaded" : "Missing";
        context += `- ${doc.name}: ${status} (Verification: ${doc.verification?.status || "Pending"})\n`;
      });
    }

    if (student.tasks && student.tasks.length > 0) {
      context += `\nPending Tasks:\n`;
      student.tasks
        .filter((t) => t.status === "pending")
        .forEach((t) => {
          context += `- ${t.title} (Due: ${t.dueDate ? new Date(t.dueDate).toDateString() : "No date"})\n`;
        });
    }

    return context;
  } catch (error) {
    console.error("Error building student context:", error);
    return "Error retrieving student context.";
  }
}

module.exports = { buildStudentContext };
