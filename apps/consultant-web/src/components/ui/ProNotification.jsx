import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, X } from "lucide-react";

const ProNotification = ({ message, type = "success", duration = 5000, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration > 0) {
      const startTime = Date.now();
      const endTime = startTime + duration;

      const updateProgress = () => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        const percentage = (remaining / duration) * 100;
        
        setProgress(percentage);

        if (remaining > 0) {
          requestAnimationFrame(updateProgress);
        } else {
          onClose && onClose();
        }
      };

      const animationFrame = requestAnimationFrame(updateProgress);
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 transform"
    >
      <div className="relative overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">
        <div className="flex items-center gap-3 px-4 py-3 pr-12">
          {type === "success" ? (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-500" />
          )}
          <p className="text-sm font-medium text-neutral-900 dark:text-white">
            {message}
          </p>
          <button
            onClick={onClose}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-500 dark:hover:bg-neutral-700"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-neutral-100 dark:bg-neutral-700">
          <motion.div
            className={`h-full ${
              type === "success" ? "bg-emerald-500" : "bg-rose-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default ProNotification;
