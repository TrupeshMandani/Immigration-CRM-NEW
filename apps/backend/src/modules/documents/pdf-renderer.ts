import PDFDocument from 'pdfkit';
import type { Applicant } from '../../db/schema/applicants';
import type { Firm } from '../../db/schema/firms';
import type { DocType } from './generation-prompts';

const DOC_TITLES: Record<DocType, string> = {
  sop:          'Statement of Purpose',
  cover_letter: 'Cover Letter – Study Permit Application',
  checklist:    'Application Checklist',
};

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[-•]\s+/gm, '  • ')
    .replace(/^\d+\.\s+/gm, (m) => `  ${m}`);
}

export function renderToPDF(
  content: string,
  type: DocType,
  applicant: Applicant,
  firm: Firm,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 72, size: 'LETTER' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const today = new Date().toLocaleDateString('en-CA');

    // Header
    doc.fontSize(9).fillColor('#666666')
      .text(firm.name, { align: 'right' })
      .text(today, { align: 'right' })
      .moveDown(0.8);

    // Title
    const title = DOC_TITLES[type] ?? type;
    doc.fontSize(16).fillColor('#111111').text(title, { align: 'center' });
    doc.moveDown(0.4);

    // Rule
    doc
      .moveTo(72, doc.y)
      .lineTo(doc.page.width - 72, doc.y)
      .lineWidth(0.5)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.6);

    // Body
    const plainText = stripMarkdown(content);
    doc.fontSize(11).fillColor('#111111').text(plainText, { align: 'left', lineGap: 3 });

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.fontSize(8).fillColor('#999999').text(
        `${firm.name} — Confidential — Page ${i + 1} of ${range.count}`,
        72,
        doc.page.height - 40,
        { align: 'center', width: doc.page.width - 144 },
      );
    }

    doc.end();
  });
}
