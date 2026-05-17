import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StudentLayout from "../../components/layout/StudentLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { billingService } from "../../services/billingService";
import { toast } from "sonner";
import { Loader2, Receipt, CheckCircle2, XCircle } from "lucide-react";

const statusVariant = {
  draft: "secondary",
  sent: "outline",
  paid: "default",
  overdue: "destructive",
};

const formatCents = (cents) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format((cents ?? 0) / 100);

const PayInvoice = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const returnStatus = searchParams.get("status"); // "success" | "cancel"
  const focusId = searchParams.get("invoiceId");

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPayingId] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await billingService.listInvoices();
        const mine = data.filter(
          (inv) => inv.student_id === (user?.id ?? user?._id)
        );
        setInvoices(mine);
      } catch {
        toast.error("Unable to load your invoices.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [user?.id, user?._id]);

  useEffect(() => {
    if (returnStatus === "success") {
      toast.success("Payment successful! Your invoice is being updated.");
    } else if (returnStatus === "cancel") {
      toast.info("Payment was cancelled. Your invoice remains unpaid.");
    }
  }, [returnStatus]);

  const handlePay = async (invoiceId) => {
    setPayingId(invoiceId);
    try {
      const { url } = await billingService.createCheckoutSession(invoiceId);
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Could not start payment session. Please try again.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? "Payment failed. Please try again."
      );
      setPayingId(null);
    }
  };

  return (
    <StudentLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and pay your outstanding invoices.
          </p>
        </div>

        {returnStatus === "success" && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>
              Payment received! Allow a few moments for your invoice status to
              update.
            </span>
          </div>
        )}

        {returnStatus === "cancel" && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <span>Payment was not completed. You can try again below.</span>
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 font-semibold">No invoices yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your advisor hasn't issued any invoices yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((inv) => {
              const isPaid = inv.status === "paid";
              const canPay = ["sent", "overdue"].includes(inv.status);
              const isThisPaying = paying === inv.id;
              const highlight = focusId === inv.id;

              return (
                <Card
                  key={inv.id}
                  className={highlight ? "ring-2 ring-primary" : ""}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        Invoice #{inv.id.slice(0, 8).toUpperCase()}
                      </CardTitle>
                      <CardDescription>
                        {inv.due_at
                          ? `Due ${new Date(inv.due_at).toLocaleDateString()}`
                          : "No due date"}
                        {inv.issued_at &&
                          ` · Issued ${new Date(inv.issued_at).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    <Badge variant={statusVariant[inv.status] ?? "secondary"}>
                      {inv.status}
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="divide-y rounded-lg border text-sm">
                      {((inv.line_items) ?? []).map((li, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-4 py-2"
                        >
                          <span className="text-foreground">{li.description}</span>
                          <span className="font-medium tabular-nums">
                            {formatCents(li.amount_cents * (li.quantity ?? 1))}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <p className="text-lg font-semibold">
                        Total{" "}
                        <span className="tabular-nums">
                          {formatCents(inv.amount_cents)}
                        </span>
                      </p>
                    </div>

                    {isPaid && inv.paid_at && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        Paid on {new Date(inv.paid_at).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>

                  {canPay && (
                    <CardFooter className="border-t pt-4">
                      <Button
                        onClick={() => handlePay(inv.id)}
                        disabled={paying !== null}
                        className="w-full sm:w-auto"
                      >
                        {isThisPaying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Redirecting to Stripe…
                          </>
                        ) : (
                          "Pay Now"
                        )}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default PayInvoice;
