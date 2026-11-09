import type { PipelineStage, QualificationStatus, FollowUpStatus, RelationshipStatus, LeadType, ApplicationReadiness, FinancingStatus } from "@/lib/types";
import {
  STAGE_COLORS,
  QUALIFICATION_COLORS,
  FOLLOW_UP_COLORS,
  RELATIONSHIP_COLORS,
  APPLICATION_READINESS_COLORS,
  FINANCING_STATUS_COLORS,
  getStageDisplayName,
} from "@/lib/constants";
import { Badge } from "./Badge";
import { cn } from "@/lib/utils";

export function StageBadge({ stage, leadType }: { stage: PipelineStage; leadType?: LeadType }) {
  return <Badge label={getStageDisplayName(stage, leadType)} className={STAGE_COLORS[stage]} dot />;
}

export function QualificationBadge({ status }: { status: QualificationStatus }) {
  return <Badge label={status} className={QUALIFICATION_COLORS[status]} />;
}

export function FollowUpBadge({ status }: { status: FollowUpStatus }) {
  return <Badge label={status} className={FOLLOW_UP_COLORS[status]} dot />;
}

export function RelationshipBadge({ status }: { status: RelationshipStatus }) {
  return <Badge label={status} className={RELATIONSHIP_COLORS[status]} />;
}

export function ApplicationReadinessBadge({ status }: { status: ApplicationReadiness }) {
  return <Badge label={`Docs: ${status}`} className={APPLICATION_READINESS_COLORS[status]} />;
}

export function FinancingBadge({ status }: { status: FinancingStatus }) {
  return <Badge label={`Financing: ${status}`} className={FINANCING_STATUS_COLORS[status]} />;
}

export function ListingExpiryBadge({ expiryDate, label = "Expires" }: { expiryDate: string; label?: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);

  const expired = daysLeft < 0;
  const urgent  = daysLeft >= 0 && daysLeft <= 7;
  const soon    = daysLeft > 7 && daysLeft <= 21;

  const cls = expired ? "bg-red-100 text-red-700"
            : urgent  ? "bg-orange-100 text-orange-700"
            : soon    ? "bg-amber-50 text-amber-700"
            :           "bg-zinc-100 text-zinc-600";

  const text = expired
    ? `${label}: Expired`
    : daysLeft === 0
    ? `${label}: Today`
    : daysLeft <= 21
    ? `${label}: ${daysLeft}d`
    : `${label}: ${expiry.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;

  return <Badge label={text} className={cn(cls, urgent || expired ? "font-semibold" : "")} />;
}
