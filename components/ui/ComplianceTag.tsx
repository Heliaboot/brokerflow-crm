import { COMPLIANCE_STEP_LABEL } from "@/lib/constants";

/**
 * Marks a workflow step that exists for regulatory reasons (buyer agreement
 * before offers, seller identity check, agent licence transfer, ...).
 * The underlying rules are jurisdiction-specific — see README "Reusable vs
 * client-specific" for how they can become per-market configuration.
 */
export function ComplianceTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ${className}`}
    >
      ⚖ {COMPLIANCE_STEP_LABEL}
    </span>
  );
}
