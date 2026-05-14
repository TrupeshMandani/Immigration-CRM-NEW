const { db } = require('../../db/postgres');
const { students, documents, tasks } = require('../../db/schema');
const { eq, and } = require('drizzle-orm');

async function buildStudentContext(studentId) {
  try {
    const [student] = await db.select().from(students)
      .where(eq(students.id, studentId)).limit(1);

    if (!student) return 'Student not found.';

    const profile = student.profile_data ?? {};
    const fullName = student.first_name
      ? `${student.first_name} ${student.last_name || ''}`.trim()
      : (profile.fullName || profile.name || 'N/A');

    let context = `Student Profile:\n`;
    context += `- Name: ${fullName}\n`;
    context += `- Email: ${student.email || 'N/A'}\n`;
    context += `- Status: ${student.status}\n`;
    context += `- Stage: ${student.stage}\n`;

    if (Object.keys(profile).length) {
      context += `\nDetailed Profile:\n${JSON.stringify(profile, null, 2)}\n`;
    }

    const docs = await db.select().from(documents).where(eq(documents.student_id, studentId));
    if (docs.length) {
      context += `\nDocuments on file: ${docs.length}\n`;
      docs.forEach((d) => {
        const verdict = d.ai_verification?.verdict ?? 'not verified';
        context += `- ${d.document_type || d.s3_key || 'Unknown'}: ${verdict}\n`;
      });
    }

    const openTasks = await db.select().from(tasks)
      .where(and(eq(tasks.student_id, studentId), eq(tasks.status, 'open')));
    if (openTasks.length) {
      context += `\nOpen Tasks (${openTasks.length}):\n`;
      openTasks.forEach((t) => {
        context += `- ${t.title} [${t.task_type}]\n`;
      });
    }

    return context;
  } catch (error) {
    console.error('Error building student context:', error);
    return 'Error retrieving student context.';
  }
}

module.exports = { buildStudentContext };
