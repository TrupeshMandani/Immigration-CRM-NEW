import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  enableBottomFade?: boolean;
};

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  className,
  enableBottomFade = false,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative w-full overflow-hidden px-6 pt-36 pb-12 md:px-10 lg:px-12 xl:px-16",
        "text-slate-900",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 z-0 backdrop-blur-sm",
          enableBottomFade
            ? "bg-gradient-to-b from-white/95 via-white/85 to-transparent"
            : "bg-white/85"
        )}
      />
      <div className="relative z-20 max-w-5xl space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#c1121f]">
          {eyebrow}
        </p>

        <h1 className="text-4xl font-semibold">
          {title}
        </h1>

        <p className="text-lg text-slate-600">
          {description}
        </p>

        {children}
      </div>
      {!enableBottomFade && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-b from-transparent via-white/60 to-white/90 backdrop-blur-md"
        />
      )}
    </section>
  );
}
