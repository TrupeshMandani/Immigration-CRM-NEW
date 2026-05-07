"use client";

import { motion } from "framer-motion";
import { processSteps } from "@/lib/constants";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionShell } from "@/components/ui/section-shell";

export function ProcessFlow() {
  return (
    <SectionShell className="space-y-12">
      <SectionHeading
        label="Process"
        title="Three-step operating model"
        description="Design-led workflow marrying eligibility intelligence, document rigor, and transparent application tracking."
      />
      <div className="relative grid gap-6 md:grid-cols-3">
        {processSteps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="relative rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,24,36,0.08)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Step {index + 1}
              </span>
              <span className="h-2 w-2 rounded-full bg-[#c1121f]" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
            <p className="mt-4 text-sm text-slate-500">{step.description}</p>
            {index < processSteps.length - 1 && (
              <motion.span
                className="absolute -right-8 top-1/2 hidden h-1 w-14 rounded-full bg-gradient-to-r from-transparent via-[#c1121f] to-transparent md:block"
                aria-hidden
                animate={{ scaleX: [0.5, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: index * 0.2 }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}
