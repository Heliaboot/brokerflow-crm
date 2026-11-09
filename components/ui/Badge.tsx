import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  className?: string;
  dot?: boolean;
}

export function Badge({ label, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
}
