/* eslint-disable no-unused-vars */
import { motion } from "framer-motion";
import {
  GraduationCap,
  FileText,
  FileCheck,
  DollarSign,
  ClipboardCheck,
  Upload,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";

const ICON_SIZE = 64;
const ICON_BORDER_THICKNESS = 4; // 2px padding on both sides
const LINE_VERTICAL_OFFSET =
  (ICON_SIZE + ICON_BORDER_THICKNESS) / 2 + 6; // center line through icons
const LINE_HORIZONTAL_OFFSET = ICON_SIZE / 2 + 12; // ensure line starts/ends at icon centers

const STEPS = [
  {
    id: 1,
    label: "IELTS / Test",
    icon: GraduationCap,
    accent: "#f97316",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
  },
  {
    id: 2,
    label: "Test Results",
    icon: FileCheck,
    accent: "#ec4899",
    gradient: "linear-gradient(135deg, #fbc2eb 0%, #a18cd1 100%)",
  },
  {
    id: 3,
    label: "Apply to DLI",
    icon: FileText,
    accent: "#8b5cf6",
    gradient: "linear-gradient(135deg, #c3cfe2 0%, #efd5ff 100%)",
  },
  {
    id: 4,
    label: "Receive LOA",
    icon: FileCheck,
    accent: "#6366f1",
    gradient: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  },
  {
    id: 5,
    label: "Funds / GIC",
    icon: DollarSign,
    accent: "#14b8a6",
    gradient: "linear-gradient(135deg, #9be15d 0%, #00e3ae 100%)",
  },
  {
    id: 6,
    label: "Docs Ready",
    icon: ClipboardCheck,
    accent: "#0ea5e9",
    gradient: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  },
  {
    id: 7,
    label: "Submit Permit",
    icon: Upload,
    accent: "#22d3ee",
    gradient: "linear-gradient(135deg, #8fd3f4 0%, #84fab0 100%)",
  },
  {
    id: 8,
    label: "Biometrics",
    icon: Fingerprint,
    accent: "#6366f1",
    gradient: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)",
  },
  {
    id: 9,
    label: "Visa Decision",
    icon: ShieldCheck,
    accent: "#a855f7",
    gradient: "linear-gradient(135deg, #fbc2eb 0%, #f7c6ff 100%)",
  },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function JourneyStep({ step, isActive, isCompleted }) {
  const Icon = step.icon;
  const iconColor = isCompleted || isActive ? step.accent : "#94a3b8";

  return (
    <div className="flex min-w-[80px] flex-1 flex-col items-center text-center">
      <div className="relative flex flex-col items-center">
        <div
          className={`rounded-[30px] p-[2px] shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-all duration-300 ${
            isActive ? "scale-105" : "scale-100"
          }`}
          style={{ backgroundImage: step.gradient }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-[26px] bg-white">
            <Icon className="h-7 w-7" style={{ color: iconColor }} />
          </div>
        </div>
        <span className="mt-3 text-[11px] font-semibold tracking-tight text-slate-600">
          {step.id}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-700">{step.label}</p>
    </div>
  );
}

export default function ApplicantJourneyWorkflowPro({
  currentStep = 1,
  completedSteps = [],
}) {
  const completedSet = new Set(completedSteps);
  const progressRatio =
    STEPS.length <= 1
      ? 0
      : clamp((currentStep - 1) / (STEPS.length - 1), 0, 1);

  return (
    <div className="relative w-full px-2 pb-2 pt-4 sm:px-4">
      <div className="relative flex w-full items-start justify-between gap-2 sm:gap-3">
        <div
          className="pointer-events-none absolute h-1 rounded-full bg-slate-200"
          aria-hidden
          style={{
            top: `${LINE_VERTICAL_OFFSET}px`,
            left: LINE_HORIZONTAL_OFFSET,
            right: LINE_HORIZONTAL_OFFSET,
          }}
        />
        <motion.div
          className="pointer-events-none absolute h-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400"
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progressRatio }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{
            transformOrigin: "left center",
            top: `${LINE_VERTICAL_OFFSET}px`,
            left: LINE_HORIZONTAL_OFFSET,
            right: LINE_HORIZONTAL_OFFSET,
          }}
        />
        {STEPS.map((step) => {
          const isCompleted =
            completedSet.has(step.id) || step.id < currentStep;
          const isActive = step.id === currentStep;
          return (
            <JourneyStep
              key={step.id}
              step={step}
              isActive={isActive}
              isCompleted={isCompleted}
            />
          );
        })}
      </div>
    </div>
  );
}
