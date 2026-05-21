import { Router, Request, Response } from 'express';
import * as stripeService from './stripe.service';
import * as invoicesService from './invoices.service';
import * as trustService from './trust.service';
import * as retainersService from './retainers.service';

export const billingRouter = Router();

function svcError(res: Response, err: unknown) {
  const e = err as { statusCode?: number; message?: string };
  return res.status(e.statusCode ?? 500).json({ success: false, message: e.message ?? 'Internal error' });
}

// ─── Stripe Connect ───────────────────────────────────────────────────────────

// POST /api/billing/stripe/connect
billingRouter.post('/stripe/connect', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const result = await stripeService.createConnectAccount(req.db, firmId);
    res.status(201).json({ success: true, ...result });
  } catch (err) { svcError(res, err); }
});

// POST /api/billing/stripe/accounts
billingRouter.post('/stripe/accounts', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const result = await stripeService.createOperatingAndTrustAccounts(req.db, firmId);
    res.status(201).json({ success: true, ...result });
  } catch (err) { svcError(res, err); }
});

// GET /api/billing/stripe/onboarding-link
billingRouter.get('/stripe/onboarding-link', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const base = process.env.APP_BASE_URL ?? 'http://localhost:5173';
    const result = await stripeService.getOnboardingLink(
      req.db,
      firmId,
      `${base}/billing/onboarding/return`,
      `${base}/billing/onboarding/refresh`,
    );
    res.json({ success: true, ...result });
  } catch (err) { svcError(res, err); }
});

// ─── Invoices ─────────────────────────────────────────────────────────────────

// GET /api/billing/invoices
billingRouter.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { firmId, role, userId } = req.context!;
    // Students are restricted to their own invoices; admins may filter by studentId optionally
    const studentId = role === 'applicant'
      ? userId
      : (req.query.studentId as string | undefined);
    const rows = await invoicesService.listInvoices(req.db, firmId, studentId);
    res.json({ success: true, invoices: rows });
  } catch (err) { svcError(res, err); }
});

// GET /api/billing/invoices/:id
billingRouter.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { firmId, role, userId } = req.context!;
    const inv = await invoicesService.getInvoice(req.db, firmId, req.params.id);
    if (role === 'applicant' && inv.applicant_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, invoice: inv });
  } catch (err) { svcError(res, err); }
});

// POST /api/billing/invoices
billingRouter.post('/invoices', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const { studentId, lineItems, retainerId, dueAt } = req.body as {
      studentId: string;
      lineItems: Array<{ description: string; amount_cents: number; quantity?: number }>;
      retainerId?: string;
      dueAt?: string;
    };
    if (!studentId || !lineItems?.length) {
      return res.status(400).json({ success: false, message: 'studentId and lineItems are required' });
    }
    const inv = await invoicesService.createInvoice(req.db, firmId, studentId, lineItems, {
      retainerId,
      dueAt: dueAt ? new Date(dueAt) : undefined,
    });
    res.status(201).json({ success: true, invoice: inv });
  } catch (err) { svcError(res, err); }
});

// POST /api/billing/invoices/:id/checkout  — student-facing Stripe Checkout
billingRouter.post('/invoices/:id/checkout', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const base = process.env.APP_BASE_URL ?? 'http://localhost:5173';
    const result = await invoicesService.createCheckoutSession(req.db, firmId, req.params.id, base);
    res.json({ success: true, ...result });
  } catch (err) { svcError(res, err); }
});

// POST /api/billing/invoices/:id/send
billingRouter.post('/invoices/:id/send', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const inv = await invoicesService.sendInvoice(req.db, firmId, req.params.id);
    res.json({ success: true, invoice: inv });
  } catch (err) { svcError(res, err); }
});

// ─── Trust Ledger ─────────────────────────────────────────────────────────────

// POST /api/billing/trust/deposit
billingRouter.post('/trust/deposit', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const entry = await trustService.recordDeposit(req.db, firmId, {
      studentId: req.body.studentId,
      amountCents: Number(req.body.amountCents),
      relatedInvoiceId: req.body.relatedInvoiceId,
      relatedStripeChargeId: req.body.relatedStripeChargeId,
      description: req.body.description,
      recordedBy: req.context!.userId,
    });
    res.status(201).json({ success: true, entry });
  } catch (err) { svcError(res, err); }
});

// POST /api/billing/trust/withdrawal
billingRouter.post('/trust/withdrawal', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const entry = await trustService.recordWithdrawal(req.db, firmId, {
      studentId: req.body.studentId,
      amountCents: Number(req.body.amountCents),
      relatedInvoiceId: req.body.relatedInvoiceId,
      description: req.body.description,
      recordedBy: req.context!.userId,
    });
    res.status(201).json({ success: true, entry });
  } catch (err) { svcError(res, err); }
});

// POST /api/billing/trust/transfer
billingRouter.post('/trust/transfer', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const entry = await trustService.recordTransfer(req.db, firmId, {
      studentId: req.body.studentId,
      amountCents: Number(req.body.amountCents),
      relatedInvoiceId: req.body.relatedInvoiceId,
      description: req.body.description,
      recordedBy: req.context!.userId,
    });
    res.status(201).json({ success: true, entry });
  } catch (err) { svcError(res, err); }
});

// GET /api/billing/trust/reconciliation?year=2025&month=6
billingRouter.get('/trust/reconciliation', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const year = Number(req.query.year ?? new Date().getFullYear());
    const month = Number(req.query.month ?? new Date().getMonth() + 1);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'Valid year and month (1-12) are required' });
    }
    const report = await trustService.generateMonthlyReconciliation(req.db, firmId, year, month);
    res.json({ success: true, report });
  } catch (err) { svcError(res, err); }
});

// ─── Retainers ────────────────────────────────────────────────────────────────

// GET /api/billing/retainers/templates
billingRouter.get('/retainers/templates', (_req: Request, res: Response) => {
  try {
    const templates = retainersService.listTemplates();
    res.json({ success: true, templates });
  } catch (err) { svcError(res, err); }
});

// GET /api/billing/retainers
billingRouter.get('/retainers', async (req: Request, res: Response) => {
  try {
    const { firmId, role, userId } = req.context!;
    // Students are restricted to their own retainers; admins may filter by studentId optionally
    const studentId = role === 'applicant'
      ? userId
      : (req.query.studentId as string | undefined);
    const rows = await retainersService.listRetainers(req.db, firmId, studentId);
    res.json({ success: true, retainers: rows });
  } catch (err) { svcError(res, err); }
});

// GET /api/billing/retainers/:id
billingRouter.get('/retainers/:id', async (req: Request, res: Response) => {
  try {
    const { firmId, role, userId } = req.context!;
    const agreement = await retainersService.getRetainer(req.db, firmId, req.params.id);
    if (role === 'applicant' && agreement.applicant_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, retainer: agreement });
  } catch (err) { svcError(res, err); }
});

// POST /api/billing/retainers
billingRouter.post('/retainers', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const { studentId, templateKey, scope } = req.body as {
      studentId: string;
      templateKey: string;
      scope?: Record<string, unknown>;
    };
    if (!studentId || !templateKey) {
      return res.status(400).json({ success: false, message: 'studentId and templateKey are required' });
    }
    const agreement = await retainersService.createDraft(
      req.db, firmId, studentId, templateKey, scope ?? {},
    );
    res.status(201).json({ success: true, retainer: agreement });
  } catch (err) { svcError(res, err); }
});

// POST /api/billing/retainers/:id/send
billingRouter.post('/retainers/:id/send', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const base = process.env.APP_BASE_URL ?? 'http://localhost:5173';
    const result = await retainersService.sendForSignature(req.db, firmId, req.params.id, base);
    res.json({ success: true, ...result });
  } catch (err) { svcError(res, err); }
});

// POST /api/billing/retainers/:id/sign
billingRouter.post('/retainers/:id/sign', async (req: Request, res: Response) => {
  try {
    const firmId = req.context!.firmId;
    const { signature } = req.body as { signature: string };
    if (!signature) {
      return res.status(400).json({ success: false, message: 'signature is required' });
    }
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
      ?? req.socket.remoteAddress
      ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const agreement = await retainersService.finalizeSignature(
      req.db, firmId, req.params.id, signature, ip, userAgent,
    );
    res.json({ success: true, retainer: agreement });
  } catch (err) { svcError(res, err); }
});
