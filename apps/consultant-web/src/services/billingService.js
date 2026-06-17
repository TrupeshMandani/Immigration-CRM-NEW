import api from "./api";

export const billingService = {
  // ── Invoices ──────────────────────────────────────────────────────────────

  listInvoices: async () => {
    const res = await api.get("/billing/invoices");
    return res.data.invoices ?? [];
  },

  getInvoice: async (id) => {
    const res = await api.get(`/billing/invoices/${id}`);
    return res.data.invoice;
  },

  /** Returns { url } — redirect the applicant to url for Stripe Checkout */
  createCheckoutSession: async (invoiceId) => {
    const res = await api.post(`/billing/invoices/${invoiceId}/checkout`);
    return res.data;
  },

  // ── Retainers ─────────────────────────────────────────────────────────────

  listRetainers: async (applicantId) => {
    const params = applicantId ? { applicantId } : {};
    const res = await api.get("/billing/retainers", { params });
    return res.data.retainers ?? [];
  },

  getRetainer: async (id) => {
    const res = await api.get(`/billing/retainers/${id}`);
    return res.data.retainer;
  },

  signRetainer: async (id, signature) => {
    const res = await api.post(`/billing/retainers/${id}/sign`, { signature });
    return res.data.retainer;
  },
};
