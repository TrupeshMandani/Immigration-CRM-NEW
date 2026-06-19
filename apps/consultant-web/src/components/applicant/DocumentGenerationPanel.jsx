import { useState, useEffect, useRef } from "react";
import { useSocket } from "../../hooks/useSocket";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileText, Download, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const DOC_TYPES = [
  {
    type: "sop",
    label: "Statement of Purpose",
    description: "AI-drafted SOP for your Canadian study permit application (600–800 words).",
  },
  {
    type: "cover_letter",
    label: "Cover Letter",
    description: "Formal cover letter addressed to IRCC, populated with your profile details.",
  },
  {
    type: "checklist",
    label: "Application Checklist",
    description: "Personalized required-documents checklist for your current application stage.",
  },
];

// ─── Download modal ────────────────────────────────────────────────────────────

const DownloadableDocumentModal = ({ open, onClose, aiKey, docType, label }) => {
  const [streamText, setStreamText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [docId, setDocId] = useState(null);
  const [version, setVersion] = useState(null);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const startGeneration = async () => {
    setStreamText("");
    setDocId(null);
    setVersion(null);
    setError(null);
    setGenerating(true);

    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/applicants/${aiKey}/generate-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: docType }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message ?? `Generation failed (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "text") {
              setStreamText((prev) => prev + parsed.delta);
            } else if (parsed.type === "done") {
              setDocId(parsed.docId);
              setVersion(parsed.version);
            } else if (parsed.type === "error") {
              throw new Error(parsed.message);
            }
          } catch (parseErr) {
            if (parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      setError(err.message ?? "Generation failed");
      toast.error(err.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Auto-start when modal opens
  useEffect(() => {
    if (open) startGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, docType]);

  // Auto-scroll streamed text
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamText]);

  const handleDownload = async () => {
    if (!docId) return;
    try {
      const token = localStorage.getItem("token");
      // Hit the redirect endpoint — browser follows the 302 to the presigned S3 URL
      const link = document.createElement("a");
      link.href = `${API_BASE}/applicants/${aiKey}/generated-documents/${docId}/download`;
      link.target = "_blank";
      // Fetch as blob so we can carry the auth header
      const resp = await fetch(link.href, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: "follow",
      });
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = `document_v${version}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error(err.message ?? "Download failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {label}
            {version && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                v{version}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {generating && !streamText && (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating your document…
          </div>
        )}

        {(streamText || error) && (
          <div
            ref={scrollRef}
            className="max-h-96 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed"
          >
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              <>
                {streamText}
                {generating && (
                  <span className="inline-block h-4 w-1 animate-pulse bg-foreground/60 ml-0.5" />
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-3">
          {!generating && !error && docId && (
            <>
              <Button variant="outline" size="sm" onClick={startGeneration} disabled={generating}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Regenerate
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="mr-1.5 h-4 w-4" />
                Download PDF
              </Button>
            </>
          )}
          {error && (
            <Button size="sm" onClick={startGeneration}>
              Retry
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Version history row ───────────────────────────────────────────────────────

const VersionHistoryAccordion = ({ aiKey, docType }) => {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`${API_BASE}/applicants/${aiKey}/generated-documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Failed to fetch history");
      const all = await resp.json();
      setDocs(all.filter((d) => d.doc_type === docType));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open) fetchHistory();
    setOpen((p) => !p);
  };

  if (!aiKey) return null;

  return (
    <div className="mt-2 border-t pt-2">
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Previous versions
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!loading && !docs.length && (
            <p className="text-xs text-muted-foreground">No previous versions.</p>
          )}
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                v{d.version} — {new Date(d.created_at).toLocaleDateString()}
              </span>
              <button
                className="text-primary hover:underline"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const resp = await fetch(
                      `${API_BASE}/applicants/${aiKey}/generated-documents/${d.id}/download`,
                      { headers: { Authorization: `Bearer ${token}` }, redirect: "follow" }
                    );
                    if (!resp.ok) throw new Error("Download failed");
                    const blob = await resp.blob();
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${d.doc_type}_v${d.version}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    toast.error(err.message ?? "Download failed");
                  }
                }}
              >
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const DocumentGenerationPanel = ({ aiKey }) => {
  const { socket } = useSocket() || {};
  const [activeType, setActiveType] = useState(null);
  const [versionBumps, setVersionBumps] = useState({});

  // Listen for document:generated events to bump version counters
  useEffect(() => {
    if (!socket) return;
    const handle = (data) => {
      setVersionBumps((prev) => ({ ...prev, [data.docType]: (prev[data.docType] ?? 0) + 1 }));
    };
    socket.on("document:generated", handle);
    return () => socket.off("document:generated", handle);
  }, [socket]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Documents</CardTitle>
        <CardDescription>
          AI-generated documents personalised to your profile. Each generation creates a new version.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {DOC_TYPES.map(({ type, label, description }) => (
          <div
            key={type}
            className="flex flex-col gap-3 rounded-lg border p-4"
          >
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
            <Button
              size="sm"
              className="mt-auto w-full"
              onClick={() => setActiveType(type)}
            >
              <FileText className="mr-1.5 h-4 w-4" />
              Generate
            </Button>
            <VersionHistoryAccordion
              key={`${type}-${versionBumps[type] ?? 0}`}
              aiKey={aiKey}
              docType={type}
            />
          </div>
        ))}
      </CardContent>

      {DOC_TYPES.map(({ type, label }) => (
        <DownloadableDocumentModal
          key={type}
          open={activeType === type}
          onClose={() => setActiveType(null)}
          aiKey={aiKey}
          docType={type}
          label={label}
        />
      ))}
    </Card>
  );
};

export default DocumentGenerationPanel;
