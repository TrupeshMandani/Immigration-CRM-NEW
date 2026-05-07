import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLDivElement>;

export function SectionShell({ className, ...props }: Props) {
  return (
    <section
      className={cn(
        "w-full px-6 py-8 md:px-10 lg:px-12 xl:px-16",
        className,
      )}
      {...props}
    />
  );
}
