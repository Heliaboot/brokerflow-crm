"use client";

import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

/**
 * Drop-in replacement for <select> that adds a visible chevron arrow
 * and removes the browser's native appearance.  Pass the same className
 * you would pass to <select> — the wrapper handles layout and the arrow.
 */
export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn("appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      {/* Chevron — non-interactive, purely decorative */}
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg
          className="h-4 w-4 text-zinc-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 0-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </div>
  );
}
