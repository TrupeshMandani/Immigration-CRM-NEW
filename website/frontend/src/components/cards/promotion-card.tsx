"use client";

import { motion } from "framer-motion";
import { FaUniversity } from "react-icons/fa";
import { type PromotionCard as PromotionCardType } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  data: PromotionCardType;
  active?: boolean;
};

export function PromotionCard({ data, active }: Props) {
  return (
    <motion.article
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      className={cn(
        "relative w-[280px] md:w-[320px] cursor-pointer overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_18px_45px_rgba(15,24,36,0.04)] transition hover:-translate-y-2",
        active && "ring-2 ring-[#c1121f]",
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-[#fff2f4]">
          <div className="flex h-full w-full items-center justify-center p-2 text-[#c1121f]">
            <FaUniversity size={24} />
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {data.intake} Intake
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {data.college}
          </h3>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{data.program}</p>
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#fef4f4] px-4 py-3 text-sm font-medium text-[#c1121f]">
        <span>{data.highlight}</span>
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
          {data.filter}
        </span>
      </div>
    </motion.article>
  );
}
