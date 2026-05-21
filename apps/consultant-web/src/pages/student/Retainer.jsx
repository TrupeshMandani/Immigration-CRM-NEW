import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ApplicantLayout from "../../components/layout/ApplicantLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { billingService } from "../../services/billingService";
import { toast } from "sonner";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";

const statusVariant = {
  draft: "secondary",
  sent: "outline",
  signed: "default",
};

const Retainer = () => {
  const { user } = useAuth();
  const [retainers, setRetainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [signature, setSignature] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    const fetchRetainers = async () => {
      try {
        const data = await billingService.listRetainers(user?.id);
        setRetainers(data);
        if (data.length > 0) setSelected(data[0]);
      } catch {
        toast.error("Unable to load your retainer agreement.");
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchRetainers();
  }, [user?.id]);

  const handleSign = async (e) => {
    e.preventDefault();
    if (!signature.trim()) {
      toast.error("Please type your full legal name to sign.");
      return;
    }
    if (!selected?.id) return;

    setSigning(true);
    try {
      const updated = await billingService.signRetainer(selected.id, signature.trim());
      setRetainers((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setSelected(updated);
      setSignature("");
      toast.success("Retainer agreement signed successfully.");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to sign. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  return (
    <ApplicantLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold">Retainer Agreement</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and sign your service agreement with your immigration advisor.
          </p>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : retainers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 font-semibold">No retainer yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your advisor hasn't sent a retainer agreement yet. Check back later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {retainers.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Agreements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {retainers.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelected(r)}
                      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                        selected?.id === r.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-medium">
                        {r.template_key ?? "Retainer Agreement"}
                      </span>
                      <Badge variant={statusVariant[r.status] ?? "secondary"}>
                        {r.status}
                      </Badge>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {selected && (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle>
                      {selected.template_key ?? "Retainer Agreement"}
                    </CardTitle>
                    <CardDescription>
                      Issued{" "}
                      {selected.created_at
                        ? new Date(selected.created_at).toLocaleDateString()
                        : "—"}
                    </CardDescription>
                  </div>
                  <Badge variant={statusVariant[selected.status] ?? "secondary"}>
                    {selected.status}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {selected.body ??
                      "Agreement body not available. Please contact your advisor."}
                  </div>

                  {selected.status === "signed" && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Signed on{" "}
                        {selected.signed_at
                          ? new Date(selected.signed_at).toLocaleString()
                          : "—"}{" "}
                        · Signature:{" "}
                        <strong>{selected.signed_by_signature ?? "—"}</strong>
                      </span>
                    </div>
                  )}
                </CardContent>

                {selected.status !== "signed" && (
                  <CardFooter className="flex-col items-start gap-4 border-t pt-6">
                    <p className="text-sm text-muted-foreground">
                      By signing below you confirm you have read and agree to the
                      terms of this agreement.
                    </p>
                    <form onSubmit={handleSign} className="flex w-full gap-3">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="signature">
                          Type your full legal name to sign
                        </Label>
                        <Input
                          id="signature"
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          placeholder="e.g. Jane Doe"
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" disabled={signing}>
                          {signing && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Sign Agreement
                        </Button>
                      </div>
                    </form>
                  </CardFooter>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </ApplicantLayout>
  );
};

export default Retainer;
