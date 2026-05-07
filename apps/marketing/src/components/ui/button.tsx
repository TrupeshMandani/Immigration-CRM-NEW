"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  newTab?: boolean;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  BaseProps;

const variantStyles: Record<NonNullable<BaseProps["variant"]>, string> = {
  primary:
    "bg-[#c1121f] text-white shadow-[0_15px_35px_rgba(145,11,32,0.35)] hover:bg-[#a50f1b]",
  secondary:
    "bg-white text-[#c1121f] border border-[#c1121f]/40 shadow-sm hover:border-[#c1121f]",
  ghost:
    "bg-transparent text-[#c1121f] border border-transparent hover:border-[#c1121f]/30",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      children,
      variant = "primary",
      href,
      newTab,
      disabled,
      ...props
    },
    ref,
  ) {
    const classes = cn(
      "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
      variantStyles[variant],
      disabled && "pointer-events-none opacity-60",
      className,
    );

    if (href) {
      const target = newTab ? "_blank" : "_self";
      return (
        <Link
          href={href}
          target={target}
          rel={newTab ? "noreferrer" : undefined}
          className={classes}
        >
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} disabled={disabled} {...props}>
        {children}
      </button>
    );
  },
);
