import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const SUGGESTED_PROMPTS = [
  "What documents do I still need to upload?",
  "What is my next step in the process?",
  "Explain my current immigration stage.",
  "What are the IRCC requirements for my application?",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
        AI
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex gap-1 items-center h-4">
          <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  if (message.type === "document_uploaded") {
    return (
      <div className="flex justify-center">
        <div className="flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            Uploaded: <strong>{message.renamedTo ?? message.documentName}</strong>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-tr-sm bg-blue-600 text-white shadow"
            : "rounded-tl-sm bg-white text-gray-800 shadow-sm border border-gray-100"
        }`}
      >
        {message.content}
        {message.streaming && (
          <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-current opacity-70" />
        )}
      </div>
    </div>
  );
}

function RateLimitBanner() {
  return (
    <div className="mx-4 mb-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
      <strong>Daily limit reached.</strong> You've sent 50 messages today. Come back tomorrow to continue chatting with your assistant.
    </div>
  );
}

function SuggestedPrompts({ onSelect }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-gray-800">Your AI Immigration Assistant</p>
        <p className="mt-1 text-sm text-gray-500">Ask anything about your case, documents, or next steps.</p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatInterface() {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const aiKey = user?.aiKey || user?.ai_key;

  // Load chat history on mount
  useEffect(() => {
    if (!aiKey || !token) return;
    (async () => {
      try {
        const res = await fetch(`/api/applicants/${aiKey}/chat/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = (data.messages ?? []).map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content ?? "",
          }));
          setMessages(mapped);
        }
      } catch {
        // History load failure is non-fatal
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, [aiKey, token]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if ((!text && !attachedFile) || isStreaming) return;

    const userContent = text || `Please upload this file: ${attachedFile?.name}`;
    const fileToSend = attachedFile;
    setInputText("");
    setAttachedFile(null);
    setUnavailable(false);

    // Optimistically add user bubble
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: userContent },
    ]);

    setIsStreaming(true);
    const assistantId = `assistant-${Date.now()}`;

    // Add empty streaming assistant bubble
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      let body;
      const headers = { Authorization: `Bearer ${token}` };

      if (fileToSend) {
        const fd = new FormData();
        fd.append("message", userContent);
        fd.append("file", fileToSend.file);
        body = fd;
      } else {
        body = JSON.stringify({ message: userContent });
        headers["Content-Type"] = "application/json";
      }

      const res = await fetch(`/api/applicants/${aiKey}/chat`, {
        method: "POST",
        headers,
        body,
      });

      if (res.status === 429) {
        setRateLimited(true);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      if (!res.ok || !res.body) {
        setUnavailable(true);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed);
            if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.delta, streaming: true }
                    : m,
                ),
              );
            } else if (event.type === "document_uploaded") {
              setMessages((prev) => [
                ...prev,
                {
                  id: `upload-${Date.now()}`,
                  type: "document_uploaded",
                  documentName: event.documentName,
                  renamedTo: event.renamedTo,
                  documentId: event.documentId,
                },
              ]);
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, streaming: false } : m,
                ),
              );
            } else if (event.type === "error") {
              setUnavailable(true);
              setMessages((prev) => prev.filter((m) => m.id !== assistantId));
            }
          } catch {
            // Malformed line — skip
          }
        }
      }

      // Finalize streaming bubble (remove cursor)
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
      );
    } catch {
      setUnavailable(true);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0 && historyLoaded;

  return (
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty && <SuggestedPrompts onSelect={(p) => { setInputText(p); textareaRef.current?.focus(); }} />}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <TypingIndicator />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error / unavailable banner */}
      {unavailable && (
        <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          Assistant is temporarily unavailable. Please try again shortly.
        </div>
      )}

      {/* Rate limit banner */}
      {rateLimited && <RateLimitBanner />}

      {/* Input area */}
      <div className="relative border-t border-gray-200 bg-white">
        {/* File preview bar */}
        {attachedFile && (
          <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2 text-sm">
            <svg className="h-4 w-4 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="flex-1 truncate text-blue-700">{attachedFile.name}</span>
            <span className="text-xs text-blue-400">{(attachedFile.file.size / 1024).toFixed(0)} KB</span>
            <button
              onClick={() => setAttachedFile(null)}
              className="ml-1 text-blue-400 hover:text-blue-600"
              aria-label="Remove attachment"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 px-4 py-3">
          {/* Attach button */}
          <label
            className="flex-shrink-0 cursor-pointer rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Attach a document"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setAttachedFile({ file, name: file.name });
                e.target.value = "";
              }}
            />
          </label>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachedFile ? "Tell me what this document is…" : "Ask me anything about your case…"}
            rows={1}
            maxLength={2000}
            disabled={isStreaming || rateLimited}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm leading-relaxed text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-200 disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={isStreaming || rateLimited || (!inputText.trim() && !attachedFile)}
            className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>

        {/* Character counter — shown when > 1800 chars typed */}
        {inputText.length > 1800 && (
          <p className="px-4 pb-1 text-right text-xs text-gray-400">
            {inputText.length}/2000
          </p>
        )}
      </div>
    </div>
  );
}
