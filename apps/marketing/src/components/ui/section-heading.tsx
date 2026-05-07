import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  label: string;
  title: string;
  description: string;
  align?: "left" | "center";
};

export function SectionHeading({
  label,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "space-y-3",
        align === "center" && "text-center mx-auto max-w-2xl",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c1121f]">
        {label}
      </p>
      <h2 className="text-3xl font-semibold text-slate-900 md:text-4xl">
        {title}
      </h2>
      <p className="text-base text-slate-600">{description}</p>
    </div>
  );
}
