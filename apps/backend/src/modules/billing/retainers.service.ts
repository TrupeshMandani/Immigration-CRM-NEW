import fs from 'fs';
import path from 'path';
import { and, eq } from 'drizzle-orm';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { db } from '../../db/postgres';
import {
  retainerAgreements,
  type RetainerAgreement,
} from '../../db/schema/retainer_agreements';
import { applicants } from '../../db/schema/applicants';

type DbClient = typeof db;

const TEMPLATES_DIR = path.join(__dirname, 'templates');

// ─── template engine ──────────────────────────────────────────────────────────
// Simple Handlebars-style {{variable}} substitution. No partials or helpers.
function renderTemplate(source: string, vars: Record<string, string>): string {
  return source.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function s3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
  });
}

function notFound(msg: string): never {
  throw Object.assign(new Error(msg), { statusCode: 404 });
}

// ─── listTemplates ────────────────────────────────────────────────────────────
export function listTemplates(): Array<{ key: string; label: string }> {
  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.hbs'));
  return files.map((file) => ({
    key: path.basename(file, '.hbs'),
    label: path.basename(file, '.hbs').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
}

// ─── readTemplate ─────────────────────────────────────────────────────────────
function readTemplate(templateKey: string): string {
  const filePath = path.join(TEMPLATES_DIR, `${templateKey}.hbs`);
  if (!fs.existsSync(filePath)) {
    throw Object.assign(new Error(`Template '${templateKey}' not found`), { statusCode: 404 });
  }
  return fs.readFileSync(filePath, 'utf8');
}

// ─── createDraft ──────────────────────────────────────────────────────────────
export async function createDraft(
  dbClient: DbClient,
  firmId: string,
  studentId: string,
  templateKey: string,
  scope: Record<string, unknown>,
): Promise<RetainerAgreement> {
  const [student] = await dbClient
    .select()
    .from(applicants)
    .where(eq(applicants.id, studentId))
    .limit(1);
  if (!student) notFound('Applicant not found');

  const source = readTemplate(templateKey);
  const renderedHtml = renderTemplate(source, {
    firmId,
    studentName: [student.first_name, student.last_name].filter(Boolean).join(' '),
    studentEmail: student.email,
    date: new Date().toLocaleDateString('en-CA'),
    ...Object.fromEntries(Object.entries(scope).map(([k, v]) => [k, String(v)])),
  });

  const [agreement] = await dbClient
    .insert(retainerAgreements)
    .values({
      firm_id: firmId,
      applicant_id: studentId,
      template_key: templateKey,
      rendered_html: renderedHtml,
      scope,
      status: 'draft',
    })
    .returning();

  return agreement;
}

// ─── sendForSignature ─────────────────────────────────────────────────────────
// Marks the retainer as 'sent' and returns a signature link the caller can
// email to the student. Actual email delivery reuses the backend sendEmail util.
export async function sendForSignature(
  dbClient: DbClient,
  firmId: string,
  retainerId: string,
  appBaseUrl: string,
): Promise<{ signUrl: string; agreement: RetainerAgreement }> {
  const [agreement] = await dbClient
    .select()
    .from(retainerAgreements)
    .where(eq(retainerAgreements.id, retainerId))
    .limit(1);
  if (!agreement || agreement.firm_id !== firmId) notFound('Retainer agreement not found');
  if (agreement.status !== 'draft') {
    throw Object.assign(
      new Error(`Cannot send retainer in status '${agreement.status}'`),
      { statusCode: 409 },
    );
  }

  const [updated] = await dbClient
    .update(retainerAgreements)
    .set({ status: 'sent' })
    .where(eq(retainerAgreements.id, retainerId))
    .returning();

  const signUrl = `${appBaseUrl}/sign-retainer/${retainerId}`;
  return { signUrl, agreement: updated };
}

// ─── finalizeSignature ────────────────────────────────────────────────────────
// Records the signature, uploads an immutable PDF to S3 with Object Lock
// (COMPLIANCE mode so the record cannot be deleted), and marks the retainer
// as 'signed'.
export async function finalizeSignature(
  dbClient: DbClient,
  firmId: string,
  retainerId: string,
  signature: string,
  ip: string,
  userAgent: string,
): Promise<RetainerAgreement> {
  const [agreement] = await dbClient
    .select()
    .from(retainerAgreements)
    .where(eq(retainerAgreements.id, retainerId))
    .limit(1);
  if (!agreement || agreement.firm_id !== firmId) notFound('Retainer agreement not found');
  if (agreement.status !== 'sent') {
    throw Object.assign(
      new Error(`Cannot sign retainer in status '${agreement.status}'`),
      { statusCode: 409 },
    );
  }

  // Build signed HTML document.
  const signedHtml = (agreement.rendered_html ?? '') +
    `\n<div class="signature-block"><p>Signed by: ${signature}</p>` +
    `<p>Date: ${new Date().toISOString()}</p>` +
    `<p>IP: ${ip}</p></div>`;

  // Upload to S3 as an immutable signed copy.
  // The bucket must have Object Lock enabled; we use COMPLIANCE mode so the
  // document cannot be deleted or overwritten until the retention date.
  const bucket = process.env.AWS_S3_BUCKET_NAME ?? '';
  const s3Key = `retainers/${firmId}/${retainerId}/signed.html`;
  const retainUntil = new Date();
  retainUntil.setFullYear(retainUntil.getFullYear() + 7); // 7-year retention

  await s3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: Buffer.from(signedHtml, 'utf8'),
      ContentType: 'text/html',
      ObjectLockMode: 'COMPLIANCE',
      ObjectLockRetainUntilDate: retainUntil,
      Metadata: {
        firmId,
        retainerId,
        signedIp: ip,
        signedAt: new Date().toISOString(),
      },
    }),
  );

  const [updated] = await dbClient
    .update(retainerAgreements)
    .set({
      status: 'signed',
      signed_at: new Date(),
      signed_ip: ip,
      signed_user_agent: userAgent,
      pdf_s3_key: s3Key,
    })
    .where(eq(retainerAgreements.id, retainerId))
    .returning();

  return updated;
}

// ─── getRetainer ─────────────────────────────────────────────────────────────
export async function getRetainer(
  dbClient: DbClient,
  firmId: string,
  retainerId: string,
): Promise<RetainerAgreement> {
  const [agreement] = await dbClient
    .select()
    .from(retainerAgreements)
    .where(eq(retainerAgreements.id, retainerId))
    .limit(1);
  if (!agreement || agreement.firm_id !== firmId) notFound('Retainer agreement not found');
  return agreement;
}

// ─── listRetainers ────────────────────────────────────────────────────────────
export async function listRetainers(
  dbClient: DbClient,
  firmId: string,
  studentId?: string,
): Promise<RetainerAgreement[]> {
  return dbClient
    .select()
    .from(retainerAgreements)
    .where(
      studentId
        ? and(eq(retainerAgreements.firm_id, firmId), eq(retainerAgreements.applicant_id, studentId))
        : eq(retainerAgreements.firm_id, firmId),
    );
}
