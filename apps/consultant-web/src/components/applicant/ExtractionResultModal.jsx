import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText } from "lucide-react";

const ExtractionResultModal = () => {
  const { socket } = useSocket() || {};
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleExtracted = (data) => {
      if (!data?.extractedFields?.length) return;
      setPayload(data);
      setOpen(true);
    };

    socket.on("document:extracted", handleExtracted);
    return () => socket.off("document:extracted", handleExtracted);
  }, [socket]);

  if (!payload) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <DialogTitle>Information extracted from your {payload.docName}</DialogTitle>
          </div>
          <DialogDescription>
            We found <strong>{payload.fieldsCount}</strong> field
            {payload.fieldsCount !== 1 ? "s" : ""} in your document. Please
            confirm these details are correct.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 divide-y divide-border rounded-md border text-sm">
          {payload.extractedFields.map((f) => (
            <div
              key={f.field}
              className="flex items-start justify-between gap-4 px-4 py-2.5"
            >
              <span className="shrink-0 font-medium text-muted-foreground">
                {f.label}
              </span>
              <span className="text-right font-medium text-foreground">
                {f.value || "—"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(false);
              navigate("/applicant/profile");
            }}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Edit Profile
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Looks correct
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExtractionResultModal;
