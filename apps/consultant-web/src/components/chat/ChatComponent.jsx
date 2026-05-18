/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState } from "react";
import { ShimmeringText } from "@/components/ui/shadcn-io/shimmering-text";
import { Paperclip, X, FileText } from "lucide-react";
import MessageRenderer from "./MessageRenderer";
import { uploadTempFile } from "../../services/ai.service";
import ProNotification from "../ui/ProNotification";

const initialMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your AI assistant. Ask me anything about students, tasks, or documents.",
};

const loadingWords = [
  "Thinking…",
  "Searching…",
  "Finding info…",
  "Verifying…",
  "Almost there…",
];

const ChatMessage = ({ role, content, onFileClick }) => {
  const isAssistant = role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-xl rounded-2xl px-4 py-2 text-sm shadow-sm ${
          isAssistant ? "bg-neutral-100 text-gray-800" : "bg-primary text-white"
        }`}
      >
        {isAssistant ? (
          <MessageRenderer content={content} onFileClick={onFileClick} />
        ) : (
          content
        )}
      </div>
    </div>
  );
};

const ChatComponent = () => {
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);
  const [loadingWordIndex, setLoadingWordIndex] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadingWordIndex(0);
      return undefined;
    }
    const interval = setInterval(() => {
      setLoadingWordIndex((prev) => {
        if (prev >= loadingWords.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: isProcessing ? "auto" : "smooth",
      });
    }
  }, [messages, isProcessing, isLoading]);

  const appendTokenToMessage = (messageId, token) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, content: `${message.content || ""}${token}` }
          : message
      )
    );
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileClick = async (fileName) => {
    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

      const response = await fetch(`${API_URL}/ai/documents/url?fileName=${encodeURIComponent(fileName)}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      
      if (response.ok) {
        const { url } = await response.json();
        window.open(url, '_blank');
      } else {
        console.error('Failed to fetch document URL');
        setError(`Failed to open file: ${fileName}`);
      }
    } catch (err) {
      console.error('Error opening file:', err);
      setError(`Error opening file: ${fileName}`);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || isProcessing) return;

    let serverNotificationShown = false;
    const handleServerNotification = (note) => {
      if (!note || !note.message) {
        return;
      }
      serverNotificationShown = true;
      setNotification({
        type: note.type === "error" ? "error" : "success",
        message: note.message,
      });
    };

    // Prepare message with file context if files exist
    let messageToSend = text;
    let uploadedFilesInfo = [];

    setIsProcessing(true);
    setIsLoading(true);

    try {
      // Upload files first if any
      if (attachedFiles.length > 0) {
        const uploadPromises = attachedFiles.map(file => uploadTempFile(file));
        const results = await Promise.all(uploadPromises);
        
        uploadedFilesInfo = results.map(f => ({
          name: f.originalName,
          path: f.tempPath,
          type: f.mimetype
        }));

        // Append context to message
        const fileContext = uploadedFilesInfo.map(f => 
          `[System: User attached file: ${f.name} (Path: ${f.path})]`
        ).join("\n");
        
        messageToSend = `${text}\n\n${fileContext}`;
      }

      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text, // Display original text to user
        files: uploadedFilesInfo // Store file info for display
      };

      const assistantId = `assistant-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      setInput("");
      setAttachedFiles([]); // Clear files after sending
      setError("");

      // Use the new AI service
      const { chatWithAI } = await import("../../services/ai.service");
      
      // Add empty AI message first (if not already added by setMessages above logic)
      // Actually we added it above, so we just need to update it
      
      let fullResponse = "";
      const studentId = undefined; 
      
      await chatWithAI(
        messageToSend,
        studentId,
        (chunk) => {
          fullResponse += chunk;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === "assistant") {
              lastMessage.content = fullResponse;
            }
            return newMessages;
          });
        },
        { onNotification: handleServerNotification }
      );

      if (uploadedFilesInfo.length > 0 && !serverNotificationShown) {
        setNotification({
          type: "success",
          message: `Successfully uploaded ${uploadedFilesInfo.length} file(s)`
        });
      }

    } catch (err) {
      console.error("Failed to chat with AI", err);
      setError("Unable to reach the AI assistant. Please try again.");
      setNotification({
        type: "error",
        message: "Failed to send message or upload files"
      });
      // ... existing error handling ...
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
    }
  };

  const streamingMessage =
    isProcessing && messages.length ? messages[messages.length - 1] : null;
  const stableMessages =
    streamingMessage && messages.length > 1
      ? messages.slice(0, messages.length - 1)
      : messages;

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
            Assistant
          </p>
          <h2 className="text-lg font-semibold text-neutral-900">AI Copilot</h2>
        </div>
        {isLoading ? (
          <span className="text-xs font-medium text-primary">Thinking...</span>
        ) : null}
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {stableMessages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            onFileClick={handleFileClick}
          />
        ))}
        {isLoading ? (
          <div className="flex justify-start">
            <div className="max-w-xl rounded-2xl bg-neutral-100 px-4 py-2 text-sm shadow-sm">
              <ShimmeringText
                className="text-sm text-neutral-500"
                text={loadingWords[loadingWordIndex]}
                wave
              />
            </div>
          </div>
        ) : null}
        {streamingMessage ? (
          <ChatMessage
            key={streamingMessage.id}
            role={streamingMessage.role}
            content={streamingMessage.content}
            onFileClick={handleFileClick}
          />
        ) : null}
      </div>

      {error ? (
        <div className="px-4 py-2 text-xs text-rose-600">{error}</div>
      ) : null}

      <form onSubmit={handleSend} className="border-t border-neutral-200 p-4">
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-primary-100 text-primary-800 px-3 py-1.5 rounded-full text-xs"
              >
                <FileText size={14} />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="hover:text-primary-900"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.csv,.xlsx"
        />
        <div className="flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-3 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            className="flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
            placeholder="Type your question..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              isProcessing || !input.trim()
                ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            Send
          </button>
        </div>
      </form>
      
      <AnimatePresence>
        {notification && (
          <ProNotification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

import { AnimatePresence } from "framer-motion";

export default ChatComponent;
