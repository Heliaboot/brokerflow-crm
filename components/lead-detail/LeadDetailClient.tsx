"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { StageBadge, QualificationBadge, FollowUpBadge, RelationshipBadge, ApplicationReadinessBadge, FinancingBadge, ListingExpiryBadge } from "@/components/ui/StageBadge";
import { fullName, formatDate, formatDateTime, cn, genId } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import { PIPELINE_STAGES, getConversionStage, FINANCING_STATUSES, APPLICATION_READINESS_STATUSES, getStageDisplayName, PRE_LISTING_CHECKLIST_TASKS, SELLER_UNDER_CONTRACT_CHECKLIST_TASKS, SELLER_LOSS_REASONS, LANDLORD_PRE_LISTING_CHECKLIST_TASKS, LANDLORD_LEASE_SIGNED_CHECKLIST_TASKS, LANDLORD_LOSS_REASONS, TENANT_LEASE_SIGNED_CHECKLIST_TASKS, CHECKLIST_ITEM_SUBTEXTS, CONDITION_TYPE_LABELS, RECRUIT_JOINED_CHECKLIST_TASKS, RECRUIT_LOSS_REASONS, YEARS_EXPERIENCE_OPTIONS } from "@/lib/constants";
import type { Lead, Activity, Reminder, Showing, ShowingTask, ChecklistItem, PipelineStage, OfferCondition, ListingDetails, ApplicationReadiness, FinancingStatus, SellerShowing, SellerShowingFeedback, OpenHouse } from "@/lib/types";
import { buildContactAttemptEvent } from "@/lib/contact-attempt";
import { useRole, AGENT_NAME, MANAGER_NAME } from "@/lib/role-context";
import { useStore } from "@/lib/store";
import { OfferPanel } from "./OfferPanel";
import { PreListingPanel } from "./PreListingPanel";
import { ListingAgreementPanel } from "./ListingAgreementPanel";
import { SellerOfferPanel } from "./SellerOfferPanel";
import { RentalApplicationsPanel } from "./RentalApplicationsPanel";
import { TenantApplicationPanel } from "./TenantApplicationPanel";
import { RecruitOfferPanel } from "./RecruitOfferPanel";
import { ComplianceTag } from "@/components/ui/ComplianceTag";

// ---- Local constants ----

const OUTREACH_TYPES = ["Phone Call", "Voicemail", "SMS", "Email", "WhatsApp", "Other"] as const;
type OutreachType = (typeof OUTREACH_TYPES)[number];

const OUTREACH_RESULTS: Record<OutreachType, string[]> = {
  "Phone Call": [
    "Connected — Two-Way Conversation",
    "Left Voicemail",
    "No Answer — No Voicemail",
    "Line Busy / Disconnected",
  ],
  Voicemail: ["Voicemail Left"],
  SMS: ["Sent — Awaiting Reply", "Reply Received"],
  Email: ["Sent — Awaiting Reply", "Reply Received"],
  WhatsApp: ["Sent — Awaiting Reply", "Reply Received"],
  Other: ["Made Contact", "No Response"],
};

const TWO_WAY_RESULTS = new Set([
  "Connected — Two-Way Conversation",
  "Reply Received",
  "Made Contact",
]);

const PASSIVE_SUGGESTIONS: Record<string, {
  title: string;
  daysFromNow: number;
  priority: "high" | "medium" | "low";
}> = {
  "No Answer — No Voicemail":  { title: "Retry outreach",               daysFromNow: 1, priority: "medium" },
  "Left Voicemail":            { title: "Follow up after voicemail",    daysFromNow: 2, priority: "medium" },
  "Voicemail Left":            { title: "Follow up after voicemail",    daysFromNow: 2, priority: "medium" },
  "Sent — Awaiting Reply":     { title: "Check for response",           daysFromNow: 3, priority: "low"    },
  "Line Busy / Disconnected":  { title: "Retry call",                   daysFromNow: 1, priority: "medium" },
  "No Response":               { title: "Retry outreach",               daysFromNow: 2, priority: "low"    },
};

const NEXT_STEP_CHIPS: Record<string, string[]> = {
  Buyer:    ["Schedule a showing", "Confirm financing status", "Send neighbourhood market report"],
  Seller:   ["Send listing presentation", "Schedule listing appointment", "Prepare comparative market analysis"],
  Landlord: ["Send rental market report", "Schedule property walkthrough", "Discuss listing price and timeline"],
  Tenant:   ["Send available listings", "Confirm budget and move-in date", "Schedule property viewings"],
  Recruit:  ["Schedule in-person meeting", "Send brokerage information package", "Research their current brokerage"],
  Investor: ["Send investment property listings", "Discuss ROI targets and criteria", "Schedule portfolio review call"],
};

const ACTIVITY_ICONS: Record<string, string> = {
  call: "📞",
  email: "✉️",
  note: "📝",
  showing: "🏠",
  showing_edited: "🏠",
  showing_deleted: "🏠",
  offer: "📄",
  stage_change: "🔄",
  reminder: "🔔",
  meeting: "🤝",
  sms: "💬",
  whatsapp: "💬",
  voicemail: "📱",
  contact_attempt: "📲",
  follow_up_created: "📅",
  assignment: "👤",
  task_completed: "✓",
  checklist: "☑",
};

const OUTCOME_NOTE_MIN_LENGTH = 10; // chars — minimum for manual outcome

const STAGE_BANNERS: Partial<Record<PipelineStage, {
  icon: string;
  text: string;
  sub: string;
  bg: string;
  border: string;
  textColor: string;
}>> = {
  "New":                     { icon: "🕐", text: "Awaiting first outreach",              sub: "Make first contact within 1 hour of lead creation.",         bg: "bg-amber-50",   border: "border-amber-200",   textColor: "text-amber-800"   },
  "Contacted":               { icon: "💬", text: "Initial conversation completed",        sub: "Log your discovery call or first appointment details to qualify this lead.", bg: "bg-blue-50",   border: "border-blue-200",    textColor: "text-blue-800"    },
  "Appointment Scheduled":   { icon: "✓",  text: "Discovery complete",                    sub: "Start active search when the client is ready to begin viewing.", bg: "bg-violet-50",  border: "border-violet-200",  textColor: "text-violet-800"  },
  "Pre-Listing":             { icon: "📋", text: "Listing agreement signed",               sub: "Complete prep checklist and list on MLS when ready.",              bg: "bg-sky-50",     border: "border-sky-200",     textColor: "text-sky-800"     },
  "Showing / Active Search": { icon: "🏠", text: "Client actively viewing opportunities", sub: "Submit offer when client is ready.",                          bg: "bg-amber-50",   border: "border-amber-200",   textColor: "text-amber-800"   },
  "Offer":                   { icon: "📄", text: "Offer submitted — awaiting outcome",    sub: "Follow up on acceptance and coordinate with all parties.",    bg: "bg-orange-50",  border: "border-orange-200",  textColor: "text-orange-800"  },
  "Under Contract":          { icon: "🤝", text: "Deal progressing toward closing",       sub: "Confirm closing details with all parties.",                   bg: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-800" },
  "Closed":                  { icon: "🎉", text: "Transaction completed",                 sub: "Consider requesting a testimonial & request referrals.",      bg: "bg-green-50",   border: "border-green-200",   textColor: "text-green-800"   },
  "Lost":                    { icon: "—",  text: "Lead marked as inactive",                sub: "You can reactivate this lead at any time.",                   bg: "bg-zinc-50",    border: "border-zinc-200",    textColor: "text-zinc-600"    },
};

type ModalKey =
  | "contact"
  | "discovery"
  | "activeSearch"
  | "offerSubmitted"
  | "dealAccepted"
  | "offerLost"
  | "offerLostNext"
  | "pauseSearch"
  | "closedElsewhere"
  | "leadLost"
  | "markClosed"
  | "followup"
  | "scheduleShowing"
  | "addShowing"
  | "editShowing"
  | "completeShowing"
  // Seller pipeline
  | "signListing"
  | "logSellerShowing"
  | "logOpenHouse"
  | "listOnMls"
  | "sellerOfferLost"
  | "listingExpiredWithdrawn"
  // Landlord pipeline
  | "landlordLost"
  // Tenant pipeline
  | "tenantLost"
  // Recruit pipeline
  | "recruitMeeting"
  | "recruitExtendOffer"
  // BRA modals
  | "braRequired"
  | "logBra"
  // Stage management
  | "moveBack"
  // Pause / suspend
  | "suspendListing"
  | "resumeSearch"
  | "resumeListing"
  | null;

function dateFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getActivitySummary(outreachType: OutreachType, result: string): string {
  const t = outreachType === "SMS" ? "SMS" : outreachType.toLowerCase();
  switch (result) {
    case "Connected — Two-Way Conversation": return `Connected ${t} conversation`;
    case "Left Voicemail":
    case "Voicemail Left":                  return `${t} — voicemail left`;
    case "No Answer — No Voicemail":        return `${t} — no answer`;
    case "Line Busy / Disconnected":        return `${t} — busy / disconnected`;
    case "Sent — Awaiting Reply":           return `${t} sent — awaiting reply`;
    case "Reply Received":                  return `${t} reply received`;
    case "Made Contact":                    return `${t} — contact made`;
    case "No Response":                     return `${t} — no response`;
    default:                                return `${outreachType}: ${result}`;
  }
}

// ---- Condition helpers (mirrors OfferPanel) ----

// CONDITION_TYPE_LABELS imported from @/lib/constants

function computeDealStatus(conditions: Pick<OfferCondition, "resolution" | "conditionDeadline">[]): "conditional" | "firm" | "fell_through" {
  if (conditions.length === 0) return "firm";
  const now = new Date();
  if (conditions.some((c) => c.resolution === "pending" && new Date(`${c.conditionDeadline}T23:59:59`) < now))
    return "fell_through";
  if (conditions.every((c) => c.resolution !== "pending")) return "firm";
  return "conditional";
}

function fmtConditionDeadline(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const diffDays = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const label = d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  if (diffDays < 0) return `${label} (overdue)`;
  if (diffDays === 0) return `${label} (today)`;
  if (diffDays === 1) return `${label} (1 day)`;
  return `${label} (${diffDays} days)`;
}

// ---- Shared UI ----

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "shrink-0 w-9 h-5 rounded-full border-2 transition-colors relative",
        on ? "bg-zinc-900 border-zinc-900" : "bg-white border-zinc-300"
      )}
    >
      <span
        className={cn(
          "absolute top-0 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

function PriorityChips({
  value,
  onChange,
}: {
  value: "high" | "medium" | "low";
  onChange: (p: "high" | "medium" | "low") => void;
}) {
  return (
    <div className="flex gap-2">
      {(["high", "medium", "low"] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors",
            value === p
              ? p === "high"
                ? "bg-red-500 text-white border-red-500"
                : p === "medium"
                ? "bg-amber-400 text-white border-amber-400"
                : "bg-zinc-400 text-white border-zinc-400"
              : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function FollowUpFields({
  title, onTitleChange, dueDate, onDueDateChange, priority, onPriorityChange,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  priority: "high" | "medium" | "low";
  onPriorityChange: (p: "high" | "medium" | "low") => void;
}) {
  return (
    <div className="space-y-2.5 pl-4 border-l-2 border-zinc-100 mt-3">
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Follow-up title"
        className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => onDueDateChange(e.target.value)}
        className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400"
      />
      <PriorityChips value={priority} onChange={onPriorityChange} />
    </div>
  );
}

function Modal({ title, onClose, children, footer }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[80vh] md:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-5 md:pt-5 md:pb-4 border-b border-zinc-100 shrink-0">
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none w-7 h-7 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4 md:px-5 md:py-4 md:space-y-5">{children}</div>
        <div className="flex flex-col-reverse gap-2 px-4 py-3 border-t border-zinc-100 shrink-0 md:flex-row md:gap-3 md:px-5 md:py-4">{footer}</div>
      </div>
    </div>
  );
}

function CancelButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
    >
      Cancel
    </button>
  );
}

function SubmitButton({ label, disabled, onClick, variant = "dark" }: { label: string; disabled: boolean; onClick: () => void; variant?: "dark" | "emerald" | "destructive" }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors",
        disabled
          ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          : variant === "emerald" ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : variant === "destructive" ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-zinc-900 text-white hover:bg-zinc-800"
      )}
    >
      {label}
    </button>
  );
}

// ---- Shared input class ----
const modalInput = "w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition border-zinc-200 focus:ring-zinc-300";
const modalTextarea = `${modalInput} resize-none`;
const modalSelect = `${modalInput} appearance-none`;
const modalLabel = "text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1.5";

// ---- Contact Attempt Modal ----

interface ContactAttemptData {
  outreachType: OutreachType;
  result: string;
  note: string;
  moveToContacted: boolean;
  addFollowUp: boolean;
  followUpTitle?: string;
  followUpDueDate?: string;
  followUpPriority?: "high" | "medium" | "low";
}

function ContactAttemptedModal({
  lead, onClose, onSubmit,
}: {
  lead: Lead;
  onClose: () => void;
  onSubmit: (data: ContactAttemptData) => void;
}) {
  const [outreachType, setOutreachType] = useState<OutreachType | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [moveToContacted, setMoveToContacted] = useState(false);
  const [addFollowUp, setAddFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDueDate, setFollowUpDueDate] = useState("");
  const [followUpPriority, setFollowUpPriority] = useState<"high" | "medium" | "low">("medium");
  const [isAutoSuggested, setIsAutoSuggested] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const isTwoWay = result ? TWO_WAY_RESULTS.has(result) : false;
  const showContactedOffer = isTwoWay && lead.stage === "New";
  const canSubmit = outreachType !== null && result !== null;
  const passiveSuggestion = result ? PASSIVE_SUGGESTIONS[result] : null;

  const handleTypeSelect = (type: OutreachType) => {
    setOutreachType(type);
    setResult(null);
    setAddFollowUp(false);
    setFollowUpTitle("");
    setFollowUpDueDate("");
    setFollowUpPriority("medium");
    setIsAutoSuggested(false);
    setSelectedChip(null);
    setMoveToContacted(false);
  };

  const handleResultSelect = (r: string) => {
    setResult(r);
    setSelectedChip(null);
    const suggestion = PASSIVE_SUGGESTIONS[r];
    if (suggestion) {
      setAddFollowUp(true);
      setFollowUpTitle(suggestion.title);
      setFollowUpDueDate(dateFromNow(suggestion.daysFromNow));
      setFollowUpPriority(suggestion.priority);
      setIsAutoSuggested(true);
      setMoveToContacted(false);
    } else {
      setAddFollowUp(false);
      setFollowUpTitle("");
      setFollowUpDueDate("");
      setFollowUpPriority("medium");
      setIsAutoSuggested(false);
      // Auto-check "Mark as Contacted" for two-way results at New stage
      if (TWO_WAY_RESULTS.has(r) && lead.stage === "New") {
        setMoveToContacted(true);
      }
    }
  };

  const handleChipSelect = (chip: string) => {
    setSelectedChip(chip);
    setFollowUpTitle(chip);
    setAddFollowUp(true);
    if (!followUpDueDate) setFollowUpDueDate(dateFromNow(2));
  };

  return (
    <Modal
      title="Log Contact Attempt"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton
            label="Log Contact"
            disabled={!canSubmit}
            onClick={() => {
              if (!outreachType || !result) return;
              onSubmit({
                outreachType, result, note,
                moveToContacted: showContactedOffer && moveToContacted,
                addFollowUp,
                followUpTitle: addFollowUp ? followUpTitle : undefined,
                followUpDueDate: addFollowUp ? followUpDueDate : undefined,
                followUpPriority: addFollowUp ? followUpPriority : undefined,
              });
            }}
          />
        </>
      }
    >
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Contact Method</p>
        <div className="flex flex-wrap gap-2">
          {OUTREACH_TYPES.map((type) => (
            <button key={type} type="button" onClick={() => handleTypeSelect(type)}
              className={cn(
                "px-3 py-1.5 min-h-[38px] flex items-center rounded-full text-sm font-medium border transition-colors",
                outreachType === type ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
              )}
            >{type}</button>
          ))}
        </div>
      </div>

      {outreachType && (
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Result</p>
          <div className="flex flex-wrap gap-2">
            {OUTREACH_RESULTS[outreachType].map((r) => (
              <button key={r} type="button" onClick={() => handleResultSelect(r)}
                className={cn(
                  "px-3 py-1.5 min-h-[38px] flex items-center rounded-full text-sm font-medium border transition-colors",
                  result === r ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                )}
              >{r}</button>
            ))}
          </div>
        </div>
      )}

      {result && (
        <>
          {showContactedOffer && (
            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <div
                className={cn("mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors", moveToContacted ? "bg-zinc-900 border-zinc-900" : "border-zinc-300 group-hover:border-zinc-500")}
                onClick={() => setMoveToContacted(!moveToContacted)}
              >
                {moveToContacted && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div onClick={() => setMoveToContacted(!moveToContacted)}>
                <p className="text-sm font-medium text-zinc-800">Mark lead as Contacted</p>
                <p className="text-xs text-zinc-500 mt-0.5">Move this lead into the Contacted stage</p>
              </div>
            </label>
          )}

          {passiveSuggestion && isAutoSuggested && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex items-start gap-3">
              <span className="text-base shrink-0">📅</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-700">Follow-up reminder suggested</p>
                <p className="text-xs text-zinc-500 mt-0.5">Pre-filled below based on this outcome.</p>
              </div>
              <button type="button" onClick={() => { setAddFollowUp(false); setIsAutoSuggested(false); }}
                className="text-xs text-zinc-400 hover:text-zinc-600 shrink-0 mt-0.5">Dismiss</button>
            </div>
          )}

          {isTwoWay && (
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Suggested next step</p>
              <div className="flex flex-wrap gap-2">
                {(NEXT_STEP_CHIPS[lead.leadType ?? "Buyer"] ?? NEXT_STEP_CHIPS["Buyer"]).map((chip) => (
                  <button key={chip} type="button" onClick={() => handleChipSelect(chip)}
                    className={cn(
                      "px-3 py-1.5 min-h-[38px] flex items-center rounded-full text-xs font-medium border transition-colors",
                      selectedChip === chip ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                    )}
                  >{chip}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-2">
              Note <span className="normal-case text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="Optional notes"
              className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2.5 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Create Follow-Up</p>
                {!addFollowUp && <p className="text-xs text-zinc-400 mt-0.5">Schedule a task for this lead</p>}
              </div>
              <Toggle on={addFollowUp} onToggle={() => { setAddFollowUp(!addFollowUp); if (isAutoSuggested) setIsAutoSuggested(false); }} />
            </div>
            {addFollowUp && (
              <FollowUpFields
                title={followUpTitle} onTitleChange={setFollowUpTitle}
                dueDate={followUpDueDate} onDueDateChange={setFollowUpDueDate}
                priority={followUpPriority} onPriorityChange={setFollowUpPriority}
              />
            )}
          </div>

          <div className="pt-3 border-t border-zinc-100 space-y-1.5">
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
            <p className="text-xs text-zinc-400">· {getActivitySummary(outreachType!, result)}</p>
            {showContactedOffer && moveToContacted && <p className="text-xs text-zinc-400">· Lead stage will update to Contacted</p>}
            {addFollowUp && <p className="text-xs text-zinc-400">· Follow-up reminder will be scheduled</p>}
          </div>
        </>
      )}
    </Modal>
  );
}

// ---- Discovery Modal ----

const TIMELINE_OPTIONS: { value: string; label: string }[] = [
  { value: "ASAP",           label: "ASAP" },
  { value: "0–3 Months",     label: "0–3 Months" },
  { value: "3–6 Months",     label: "3–6 Months" },
  { value: "6–12 Months",    label: "6–12 Months" },
  { value: "12+ Months",     label: "12+ Months" },
  { value: "Just Exploring", label: "Just Exploring" },
  { value: "Unknown",        label: "Unknown" },
];

interface DiscoveryData {
  // Buyer fields
  budgetDiscussed: boolean;
  timelineDiscussed: boolean;
  motivationDiscussed: boolean;
  propertyTypeConfirmed: boolean;
  // Seller fields
  sellerMotivationDiscussed: boolean;
  propertyDetailsReviewed: boolean;
  sellerTimelineDiscussed: boolean;
  priceExpectationsDiscussed: boolean;
  notes: string;
  // Captured preference values (applied to lead on submit)
  budget?: string;
  clientTimeline?: string;
  motivationNotes?: string;
  propertyType?: string;
  preferredAreas?: string;   // comma-separated string, split on save
  sellerMotivationNotes?: string;
  sellerPropertyType?: string;
  propertyDetailsNotes?: string;
  priceExpectations?: string;
  // Seller-only closing date
  closingDateDiscussed: boolean;
  closingDateExpectation?: string;
  // Recruit fields
  brokerageDiscussed: boolean;
  experienceDiscussed: boolean;
  annualVolumeDiscussed: boolean;
  areasDiscussedRecruit: boolean;
  commissionDiscussed: boolean;
  currentBrokerage?: string;
  yearsExperience?: string;
  annualTransactionVolume?: string;
  areasOfFocus?: string;
  expectedCommissionSplit?: string;
}

function DiscoveryModal({ onClose, onSubmit, isSeller = false, isLandlord = false, isTenant = false, isRecruit = false, lead }: {
  onClose: () => void;
  onSubmit: (data: DiscoveryData) => void;
  isSeller?: boolean;
  isLandlord?: boolean;
  isTenant?: boolean;
  isRecruit?: boolean;
  lead: Lead;
}) {
  const [budgetDiscussed, setBudgetDiscussed] = useState(false);
  const [timelineDiscussed, setTimelineDiscussed] = useState(false);
  const [motivationDiscussed, setMotivationDiscussed] = useState(false);
  const [propertyTypeConfirmed, setPropertyTypeConfirmed] = useState(false);
  const [sellerMotivationDiscussed, setSellerMotivationDiscussed] = useState(false);
  const [propertyDetailsReviewed, setPropertyDetailsReviewed] = useState(false);
  const [sellerTimelineDiscussed, setSellerTimelineDiscussed] = useState(false);
  const [priceExpectationsDiscussed, setPriceExpectationsDiscussed] = useState(false);
  const [closingDateDiscussed, setClosingDateDiscussed] = useState(false);
  const [closingDateTimeline, setClosingDateTimeline] = useState("");
  const [closingDateOther, setClosingDateOther] = useState("");
  // Recruit toggles
  const [brokerageDiscussed, setBrokerageDiscussed] = useState(false);
  const [experienceDiscussed, setExperienceDiscussed] = useState(false);
  const [annualVolumeDiscussed, setAnnualVolumeDiscussed] = useState(false);
  const [areasDiscussedRecruit, setAreasDiscussedRecruit] = useState(false);
  const [commissionDiscussed, setCommissionDiscussed] = useState(false);
  const [notes, setNotes] = useState("");

  // Expandable sub-fields — pre-filled from existing lead data
  const [budget, setBudget] = useState(lead.budget ?? "");
  const [clientTimeline, setClientTimeline] = useState(lead.clientTimeline ?? "");
  const [motivationNotes, setMotivationNotes] = useState(lead.motivationNotes ?? "");
  const [propertyType, setPropertyType] = useState(lead.propertyType ?? "");
  const [preferredAreas, setPreferredAreas] = useState((lead.preferredAreas ?? []).join(", "));
  const [sellerMotivationNotes, setSellerMotivationNotes] = useState(lead.motivationNotes ?? "");
  const [sellerPropertyType, setSellerPropertyType] = useState(lead.propertyType ?? "");
  const [propertyDetailsNotes, setPropertyDetailsNotes] = useState("");
  const [priceExpectations, setPriceExpectations] = useState("");
  // Recruit sub-fields
  const [currentBrokerage, setCurrentBrokerage] = useState(lead.currentBrokerage ?? "");
  const [yearsExperience, setYearsExperience] = useState(lead.yearsExperience ?? "");
  const [annualTransactionVolume, setAnnualTransactionVolume] = useState(lead.annualTransactionVolume ?? "");
  const [areasOfFocus, setAreasOfFocus] = useState(lead.areasOfFocus ?? "");
  const [expectedCommissionSplit, setExpectedCommissionSplit] = useState(lead.expectedCommissionSplit ?? "");

  const buyerAny = budgetDiscussed || timelineDiscussed || motivationDiscussed || propertyTypeConfirmed;
  const sellerAny = sellerMotivationDiscussed || propertyDetailsReviewed || sellerTimelineDiscussed || priceExpectationsDiscussed || closingDateDiscussed;
  const recruitAny = brokerageDiscussed || experienceDiscussed || annualVolumeDiscussed || areasDiscussedRecruit || commissionDiscussed;
  const canSubmit = isRecruit ? recruitAny : isSeller ? sellerAny : buyerAny;

  const fi = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition mt-2";
  const fl = "text-xs font-medium text-zinc-500 block mt-2 mb-0.5";

  return (
    <Modal
      title="Complete Discovery"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton label="Complete Discovery" disabled={!canSubmit}
            onClick={() => onSubmit({
              budgetDiscussed, timelineDiscussed, motivationDiscussed, propertyTypeConfirmed,
              sellerMotivationDiscussed, propertyDetailsReviewed, sellerTimelineDiscussed, priceExpectationsDiscussed,
              closingDateDiscussed,
              closingDateExpectation: closingDateDiscussed
                ? (closingDateTimeline === "Other" ? closingDateOther.trim() : closingDateTimeline)
                : undefined,
              brokerageDiscussed, experienceDiscussed, annualVolumeDiscussed, areasDiscussedRecruit, commissionDiscussed,
              notes,
              budget: budgetDiscussed ? budget : undefined,
              clientTimeline: (budgetDiscussed || timelineDiscussed || sellerTimelineDiscussed) ? clientTimeline : undefined,
              motivationNotes: motivationDiscussed ? motivationNotes : undefined,
              propertyType: propertyTypeConfirmed ? propertyType : undefined,
              preferredAreas: propertyTypeConfirmed ? preferredAreas : undefined,
              sellerMotivationNotes: sellerMotivationDiscussed ? sellerMotivationNotes : undefined,
              sellerPropertyType: propertyDetailsReviewed ? sellerPropertyType : undefined,
              propertyDetailsNotes: propertyDetailsReviewed ? propertyDetailsNotes : undefined,
              priceExpectations: priceExpectationsDiscussed ? priceExpectations : undefined,
              currentBrokerage: brokerageDiscussed ? currentBrokerage : undefined,
              yearsExperience: experienceDiscussed ? yearsExperience : undefined,
              annualTransactionVolume: annualVolumeDiscussed ? annualTransactionVolume : undefined,
              areasOfFocus: areasDiscussedRecruit ? areasOfFocus : undefined,
              expectedCommissionSplit: commissionDiscussed ? expectedCommissionSplit : undefined,
            })}
          />
        </>
      }
    >
      {isRecruit ? (
        // ── Recruit fields ──
        <div className="space-y-2">
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Current Brokerage Discussed</p>
              <Toggle on={brokerageDiscussed} onToggle={() => setBrokerageDiscussed(!brokerageDiscussed)} />
            </div>
            {brokerageDiscussed && (
              <div>
                <label className={fl}>Current brokerage name</label>
                <input type="text" value={currentBrokerage} onChange={(e) => setCurrentBrokerage(e.target.value)}
                  placeholder="e.g. Example Brokerage" className={fi} autoFocus />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Experience Discussed</p>
              <Toggle on={experienceDiscussed} onToggle={() => setExperienceDiscussed(!experienceDiscussed)} />
            </div>
            {experienceDiscussed && (
              <div>
                <label className={fl}>Years of Experience</label>
                <select value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)}
                  className={fi + " appearance-none"}>
                  <option value="">Select…</option>
                  {YEARS_EXPERIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Annual Volume Discussed</p>
              <Toggle on={annualVolumeDiscussed} onToggle={() => setAnnualVolumeDiscussed(!annualVolumeDiscussed)} />
            </div>
            {annualVolumeDiscussed && (
              <div>
                <label className={fl}>Annual Transaction Volume</label>
                <select value={annualTransactionVolume} onChange={(e) => setAnnualTransactionVolume(e.target.value)}
                  className={fi + " appearance-none"}>
                  <option value="">Select…</option>
                  <option value="under_5">Under 5 deals/year</option>
                  <option value="5_to_12">5–12 deals/year</option>
                  <option value="13_to_24">13–24 deals/year</option>
                  <option value="over_25">25+ deals/year</option>
                </select>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Areas of Focus Discussed</p>
              <Toggle on={areasDiscussedRecruit} onToggle={() => setAreasDiscussedRecruit(!areasDiscussedRecruit)} />
            </div>
            {areasDiscussedRecruit && (
              <div>
                <label className={fl}>Market areas / specialization</label>
                <input type="text" value={areasOfFocus} onChange={(e) => setAreasOfFocus(e.target.value)}
                  placeholder="e.g. East End, Residential Resale" className={fi} />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Commission Expectations Discussed</p>
              <Toggle on={commissionDiscussed} onToggle={() => setCommissionDiscussed(!commissionDiscussed)} />
            </div>
            {commissionDiscussed && (
              <div>
                <label className={fl}>Expected commission split</label>
                <input type="text" value={expectedCommissionSplit} onChange={(e) => setExpectedCommissionSplit(e.target.value)}
                  placeholder="e.g. 80/20, 85/15" className={fi} />
              </div>
            )}
          </div>
        </div>
      ) : !isSeller ? (
        // ── Buyer / Tenant fields ──
        <div className="space-y-2">
          {/* Budget */}
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">{isTenant ? "Rental Budget Discussed" : "Budget Discussed"}</p>
              <Toggle on={budgetDiscussed} onToggle={() => setBudgetDiscussed(!budgetDiscussed)} />
            </div>
            {budgetDiscussed && (
              <div>
                <label className={fl}>{isTenant ? "Monthly rental budget" : "Budget range"}</label>
                <input type="text" value={budget} onChange={(e) => setBudget(e.target.value)}
                  placeholder={isTenant ? "e.g. $2,000 – $2,800/mo" : "e.g. $500,000 – $650,000"} className={fi} autoFocus />
              </div>
            )}
          </div>

          {/* Timeline (standalone) */}
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Timeline Discussed</p>
              <Toggle on={timelineDiscussed} onToggle={() => setTimelineDiscussed(!timelineDiscussed)} />
            </div>
            {timelineDiscussed && (
              <div>
                <label className={fl}>Move-in timeline</label>
                <select value={clientTimeline} onChange={(e) => setClientTimeline(e.target.value)}
                  className={fi + " appearance-none"}>
                  <option value="">Select timeline…</option>
                  {TIMELINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Motivation */}
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Motivation Discussed</p>
              <Toggle on={motivationDiscussed} onToggle={() => setMotivationDiscussed(!motivationDiscussed)} />
            </div>
            {motivationDiscussed && (
              <div>
                <label className={fl}>{isTenant ? "Tenant's motivation" : "Client's motivation"}</label>
                <textarea value={motivationNotes} onChange={(e) => setMotivationNotes(e.target.value)}
                  rows={2} placeholder={isTenant ? "Why are they renting? Relocating, lease ending soon?" : "Why are they buying? Any urgency?"} className={fi} />
              </div>
            )}
          </div>

          {/* Property Type */}
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">{isTenant ? "Unit Type Confirmed" : "Property Type Confirmed"}</p>
              <Toggle on={propertyTypeConfirmed} onToggle={() => setPropertyTypeConfirmed(!propertyTypeConfirmed)} />
            </div>
            {propertyTypeConfirmed && (
              <div>
                <label className={fl}>{isTenant ? "Unit type" : "Property type"}</label>
                <input type="text" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}
                  placeholder={isTenant ? "e.g. Condo, Basement, Studio" : "e.g. Condo, Detached, Townhouse"} className={fi} />
                <label className={fl}>Preferred areas <span className="font-normal text-zinc-400">(comma-separated)</span></label>
                <input type="text" value={preferredAreas} onChange={(e) => setPreferredAreas(e.target.value)}
                  placeholder="e.g. Downtown, Midtown" className={fi} />
              </div>
            )}
          </div>
        </div>
      ) : (
        // ── Seller / Landlord fields ──
        <div className="space-y-2">
          {/* Motivation */}
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">
                {isLandlord ? "Landlord Motivation Discussed" : "Seller Motivation Discussed"}
              </p>
              <Toggle on={sellerMotivationDiscussed} onToggle={() => setSellerMotivationDiscussed(!sellerMotivationDiscussed)} />
            </div>
            {sellerMotivationDiscussed && (
              <div>
                <label className={fl}>{isLandlord ? "Landlord's motivation" : "Seller's motivation"}</label>
                <textarea value={sellerMotivationNotes} onChange={(e) => setSellerMotivationNotes(e.target.value)}
                  rows={2} placeholder={isLandlord ? "Why are they renting out? Any urgency?" : "Why are they selling? Any urgency?"} className={fi} />
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Property Details Reviewed</p>
              <Toggle on={propertyDetailsReviewed} onToggle={() => setPropertyDetailsReviewed(!propertyDetailsReviewed)} />
            </div>
            {propertyDetailsReviewed && (
              <div>
                <label className={fl}>{isLandlord ? "Unit type" : "Property type"}</label>
                <input type="text" value={sellerPropertyType} onChange={(e) => setSellerPropertyType(e.target.value)}
                  placeholder={isLandlord ? "e.g. Condo, Basement, Semi-detached" : "e.g. Detached, Townhouse, Condo"} className={fi} />
                <label className={fl}>Property notes <span className="font-normal text-zinc-400">(optional)</span></label>
                <textarea value={propertyDetailsNotes} onChange={(e) => setPropertyDetailsNotes(e.target.value)}
                  rows={2} placeholder="Address, condition, special features…" className={fi} />
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Timeline Discussed</p>
              <Toggle on={sellerTimelineDiscussed} onToggle={() => setSellerTimelineDiscussed(!sellerTimelineDiscussed)} />
            </div>
            {sellerTimelineDiscussed && (
              <div>
                <label className={fl}>{isLandlord ? "Rental timeline" : "Selling timeline"}</label>
                <select value={clientTimeline} onChange={(e) => setClientTimeline(e.target.value)}
                  className={fi + " appearance-none"}>
                  <option value="">Select timeline…</option>
                  {TIMELINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Price Expectations */}
          <div className="rounded-xl border border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">
                {isLandlord ? "Rental Price Expectations Discussed" : "Price Expectations Discussed"}
              </p>
              <Toggle on={priceExpectationsDiscussed} onToggle={() => setPriceExpectationsDiscussed(!priceExpectationsDiscussed)} />
            </div>
            {priceExpectationsDiscussed && (
              <div>
                <label className={fl}>{isLandlord ? "Expected monthly rent" : "Expected sale price"}</label>
                <input type="text" value={priceExpectations} onChange={(e) => setPriceExpectations(e.target.value)}
                  placeholder={isLandlord ? "e.g. $2,500/mo" : "e.g. $850,000"} className={fi} />
              </div>
            )}
          </div>

          {/* Closing Date Expectation — Seller only */}
          {!isLandlord && (
            <div className="rounded-xl border border-zinc-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-700">Closing Date Expectation Discussed</p>
                <Toggle on={closingDateDiscussed} onToggle={() => setClosingDateDiscussed(!closingDateDiscussed)} />
              </div>
              {closingDateDiscussed && (
                <div>
                  <label className={fl}>Preferred Closing Timeline</label>
                  <select value={closingDateTimeline} onChange={(e) => setClosingDateTimeline(e.target.value)}
                    className={fi + " appearance-none"}>
                    <option value="">Select timeline…</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="Other">Other</option>
                  </select>
                  {closingDateTimeline === "Other" && (
                    <input type="text" value={closingDateOther} onChange={(e) => setClosingDateOther(e.target.value)}
                      placeholder="e.g. 120 days, flexible, ASAP"
                      className={fi + " mt-2"} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder={isRecruit ? "Recruiting notes, concerns, timeline to join…" : isLandlord ? "Property details, landlord's goals, rental expectations…" : isSeller ? "Property details, seller's goals, any concerns…" : "Discovery notes..."}
          className={modalTextarea} />
      </div>

      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Discovery notes logged</p>
        <p className="text-xs text-zinc-400">· {isRecruit ? "Recruit qualified — meeting scheduled" : isLandlord ? "Landlord qualified — appointment scheduled" : isSeller ? "Seller qualified — appointment scheduled" : "Lead will advance to Qualified"}</p>
        {(budgetDiscussed || timelineDiscussed || motivationDiscussed || propertyTypeConfirmed || sellerMotivationDiscussed || sellerTimelineDiscussed || priceExpectationsDiscussed || brokerageDiscussed || experienceDiscussed || annualVolumeDiscussed || areasDiscussedRecruit || commissionDiscussed) && (
          <p className="text-xs text-zinc-400">· Recruit profile updated</p>
        )}
      </div>
    </Modal>
  );
}

// ---- Pause Search Modal ----

const BUYER_PAUSE_REASONS = [
  "Not financially ready yet",
  "Waiting for mortgage pre-approval",
  "Life circumstances changed",
  "Travelling",
  "Waiting for the right property",
  "Other",
];
const TENANT_PAUSE_REASONS = [
  "Not ready to move yet",
  "Budget concerns",
  "Life circumstances changed",
  "Travelling",
  "Waiting for specific area availability",
  "Other",
];

interface PauseSearchData { reason: string; returnDate: string; notes: string; }

function PauseSearchModal({ onClose, onSubmit, leadType }: { onClose: () => void; onSubmit: (d: PauseSearchData) => void; leadType?: string }) {
  const reasons = leadType === "Tenant" ? TENANT_PAUSE_REASONS : BUYER_PAUSE_REASONS;
  const [reason, setReason] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit = reason.length > 0;

  return (
    <Modal title="Pause Search" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Pause Search" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ reason, returnDate, notes }); }} /></>}>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Client asked to pause — not lost.</p>
        <p className="text-xs text-amber-600 mt-0.5">Lead stays at current stage. A check-in reminder will be created if a return date is set.</p>
      </div>
      <div>
        <label className={modalLabel}>Pause Reason <span className="normal-case text-zinc-400 font-normal">(required)</span></label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={modalInput}>
          <option value="">Select a reason…</option>
          {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className={modalLabel}>Expected Return Date <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className={modalInput} />
        <p className="text-xs text-zinc-400 mt-1">Leave blank if unknown</p>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Any context for the check-in…" className={modalTextarea} />
      </div>
    </Modal>
  );
}

// ---- Suspend Listing Modal (Seller / Landlord) ----

const SELLER_SUSPEND_REASONS = [
  "Planning renovations",
  "Waiting for market conditions",
  "Personal circumstances",
  "Travelling",
  "Relisting at a higher price",
  "Other",
];
const LANDLORD_SUSPEND_REASONS = [
  "Unit needs repairs",
  "Tenant decided to renew",
  "Waiting for better rental season",
  "Personal circumstances",
  "Other",
];

interface SuspendListingData { startDate: string; endDate: string; reason: string; notes: string; }

function SuspendListingModal({ onClose, onSubmit, isLandlord }: { onClose: () => void; onSubmit: (d: SuspendListingData) => void; isLandlord?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const reasons = isLandlord ? LANDLORD_SUSPEND_REASONS : SELLER_SUSPEND_REASONS;
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit = startDate.length > 0 && endDate.length > 0 && endDate > startDate && reason.length > 0;

  return (
    <Modal title="Suspend Listing" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Suspend Listing" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ startDate, endDate, reason, notes }); }} /></>}>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Listing goes off MLS temporarily.</p>
        <p className="text-xs text-amber-600 mt-0.5">The listing agreement with the brokerage remains active. Client cannot re-list with another agent during suspension.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={modalLabel}>Suspension Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={modalInput} />
        </div>
        <div>
          <label className={modalLabel}>Suspension End Date <span className="normal-case text-zinc-400 font-normal">(required)</span></label>
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={modalInput} />
        </div>
      </div>
      <div>
        <label className={modalLabel}>Reason <span className="normal-case text-zinc-400 font-normal">(required)</span></label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={modalInput}>
          <option value="">Select a reason…</option>
          {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Any additional context…" className={modalTextarea} />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will</p>
        <p className="text-xs text-zinc-400">· Set a suspension reminder at the end date</p>
        <p className="text-xs text-zinc-400">· Log the suspension to the activity timeline</p>
      </div>
    </Modal>
  );
}

// ---- Closed Elsewhere Modal ----

interface ClosedElsewhereData { reason: string; notes: string; }

const NOT_NOW_REASONS: Record<string, { value: string; label: string }[]> = {
  Buyer: [
    { value: "went_another_agent",   label: "Went with another agent" },
    { value: "not_ready",            label: "Not ready to buy — timing not right" },
    { value: "financing",            label: "Financing not in place" },
    { value: "keep_renting",         label: "Decided to keep renting" },
    { value: "market_conditions",    label: "Waiting for better market conditions" },
    { value: "life_circumstances",   label: "Life circumstances changed" },
    { value: "other",                label: "Other" },
  ],
  Investor: [
    { value: "went_another_agent",   label: "Went with another agent" },
    { value: "not_ready",            label: "Not ready to invest — timing not right" },
    { value: "financing",            label: "Financing not in place" },
    { value: "market_conditions",    label: "Waiting for better market conditions" },
    { value: "life_circumstances",   label: "Life circumstances changed" },
    { value: "other",                label: "Other" },
  ],
  Seller: [
    { value: "went_another_agent",   label: "Listed with another agent" },
    { value: "not_selling",          label: "Decided not to sell for now" },
    { value: "market_conditions",    label: "Waiting for better market conditions" },
    { value: "needs_time",           label: "Needs more time to prepare" },
    { value: "life_circumstances",   label: "Life circumstances changed" },
    { value: "other",                label: "Other" },
  ],
  Landlord: [
    { value: "went_another_agent",   label: "Listed with another agent" },
    { value: "not_renting",          label: "Decided not to rent the property" },
    { value: "timing",               label: "Timing not right" },
    { value: "life_circumstances",   label: "Life circumstances changed" },
    { value: "other",                label: "Other" },
  ],
  Tenant: [
    { value: "went_another_agent",   label: "Found rental through another agent" },
    { value: "found_independently",  label: "Found rental independently" },
    { value: "staying_put",          label: "Decided to stay in current place" },
    { value: "not_ready",            label: "Not ready to move yet" },
    { value: "other",                label: "Other" },
  ],
  Recruit: [
    { value: "joined_another",       label: "Joined another brokerage" },
    { value: "staying_current",      label: "Staying at current brokerage for now" },
    { value: "not_ready",            label: "Not ready to make a move" },
    { value: "exploring",            label: "Exploring other options" },
    { value: "other",                label: "Other" },
  ],
};

function ClosedElsewhereModal({ onClose, onSubmit, leadType }: { onClose: () => void; onSubmit: (d: ClosedElsewhereData) => void; leadType?: string }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const type = leadType ?? "Buyer";
  const reasons = NOT_NOW_REASONS[type] ?? NOT_NOW_REASONS["Buyer"];

  const sixMonthDate = new Date();
  sixMonthDate.setMonth(sixMonthDate.getMonth() + 6);
  const oneYearDate = new Date();
  oneYearDate.setFullYear(oneYearDate.getFullYear() + 1);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });

  return (
    <Modal title="Not Now" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Move to Nurture" disabled={!reason} onClick={() => { if (!reason) return; onSubmit({ reason, notes }); }} /></>}>
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-blue-800">This lead will move to the Nurture phase.</p>
        <p className="text-xs text-blue-600 mt-0.5">
          Automatic follow-ups on <strong>{fmtDate(sixMonthDate)}</strong> and <strong>{fmtDate(oneYearDate)}</strong> — so you never lose touch.
        </p>
      </div>
      <div>
        <label className={modalLabel}>Reason <span className="text-red-400">*</span></label>
        <Select value={reason} onChange={(e) => setReason(e.target.value)} className={modalSelect}>
          <option value="" disabled>Select reason…</option>
          {reasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Any context worth remembering for when you follow up…" className={modalTextarea} />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will</p>
        <p className="text-xs text-zinc-400">· Move lead to Nurture — follow-up status: Long-Term Follow-Up</p>
        <p className="text-xs text-zinc-400">· Create a 6-month check-in reminder ({fmtDate(sixMonthDate)})</p>
        <p className="text-xs text-zinc-400">· Create a 1-year check-in reminder ({fmtDate(oneYearDate)})</p>
      </div>
    </Modal>
  );
}

// ---- Lead Lost Modal (general — Do Not Contact) ----

const LEAD_LOST_REASONS = [
  { value: "no_longer_interested",  label: "No longer interested" },
  { value: "unresponsive",          label: "Unresponsive — gave up" },
  { value: "explicitly_ended",      label: "Explicitly ended relationship" },
  { value: "other",                 label: "Other" },
];

interface LeadLostData { reason: string; notes: string; }

function LeadLostModal({ onClose, onSubmit, isRecruit = false }: { onClose: () => void; onSubmit: (d: LeadLostData) => void; isRecruit?: boolean }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const reasons = isRecruit ? RECRUIT_LOSS_REASONS : LEAD_LOST_REASONS;
  return (
    <Modal title={isRecruit ? "Mark Recruit as Inactive" : "Mark Lead as Inactive"} onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Mark as Inactive" disabled={!reason} onClick={() => { if (!reason) return; onSubmit({ reason, notes }); }} variant="destructive" /></>}>
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-red-800">{isRecruit ? "This recruit will be marked Inactive." : "This lead will be marked Inactive — Do Not Contact."}</p>
        <p className="text-xs text-red-600 mt-0.5">{isRecruit ? "No reminders will be created. You can reactivate this lead at any time." : "No reminders will be created. Use this only when the client has explicitly ended the relationship."}</p>
      </div>
      <div>
        <label className={modalLabel}>Reason for Deactivation <span className="text-red-400">*</span></label>
        <Select value={reason} onChange={(e) => setReason(e.target.value)} className={modalSelect}>
          <option value="">Select reason…</option>
          {reasons.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder={isRecruit ? "Any context on why they didn't join…" : "Any context…"} className={modalTextarea} />
      </div>
    </Modal>
  );
}

// ---- Log Seller Showing Modal ----

const FEEDBACK_OPTIONS: { value: SellerShowingFeedback; label: string; cls: string }[] = [
  { value: "positive", label: "Positive",  cls: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  { value: "neutral",  label: "Neutral",   cls: "border-zinc-200 bg-zinc-50 text-zinc-700" },
  { value: "negative", label: "Negative",  cls: "border-red-200 bg-red-50 text-red-700" },
  { value: "none",     label: "No feedback", cls: "border-zinc-200 bg-white text-zinc-500" },
];

function LogSellerShowingModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (d: Omit<SellerShowing, "id" | "leadId" | "createdBy" | "createdAt">) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [showingDate, setShowingDate] = useState(today);
  const [showingTime, setShowingTime] = useState("");
  const [buyerAgentName, setBuyerAgentName] = useState("");
  const [feedback, setFeedback] = useState<SellerShowingFeedback>("none");
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Log Showing" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Log Showing" disabled={!showingDate} onClick={() => onSubmit({ showingDate, showingTime: showingTime || undefined, buyerAgentName: buyerAgentName || undefined, feedback, notes: notes || undefined })} /></>}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={modalLabel}>Date <span className="text-red-400">*</span></label>
          <input type="date" value={showingDate} onChange={(e) => setShowingDate(e.target.value)} className={modalInput} />
        </div>
        <div>
          <label className={modalLabel}>Time <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="time" value={showingTime} onChange={(e) => setShowingTime(e.target.value)} className={modalInput} />
        </div>
      </div>
      <div>
        <label className={modalLabel}>Buyer Agent <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={buyerAgentName} onChange={(e) => setBuyerAgentName(e.target.value)}
          placeholder="e.g. Mike Johnson, Example Brokerage" className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>Feedback</label>
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => setFeedback(o.value)}
              className={cn("rounded-xl border px-3 py-2 text-sm font-medium text-left transition-colors",
                feedback === o.value ? o.cls : "border-zinc-200 text-zinc-500 hover:bg-zinc-50")}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Buyer's comments, concerns, strong interest…" className={modalTextarea} />
      </div>
    </Modal>
  );
}

// ---- Log Open House Modal ----

function LogOpenHouseModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (d: Omit<OpenHouse, "id" | "leadId" | "createdBy" | "createdAt">) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");
  const [visitorCount, setVisitorCount] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Log Open House" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Log Open House" disabled={!date} onClick={() => onSubmit({ date, startTime: startTime || undefined, endTime: endTime || undefined, visitorCount: visitorCount ? parseInt(visitorCount) : undefined, notes: notes || undefined })} /></>}>
      <div>
        <label className={modalLabel}>Date <span className="text-red-400">*</span></label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={modalInput} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={modalLabel}>Start Time</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={modalInput} />
        </div>
        <div>
          <label className={modalLabel}>End Time</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={modalInput} />
        </div>
      </div>
      <div>
        <label className={modalLabel}>Visitors <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="number" min="0" value={visitorCount} onChange={(e) => setVisitorCount(e.target.value)}
          placeholder="e.g. 14" className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Overall interest level, notable visitors, feedback themes…" className={modalTextarea} />
      </div>
    </Modal>
  );
}

// ---- Seller Showing Log ----

const FEEDBACK_STYLES: Record<SellerShowingFeedback, { label: string; cls: string; dot: string }> = {
  positive: { label: "Positive",    cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  neutral:  { label: "Neutral",     cls: "bg-zinc-100 text-zinc-600",      dot: "bg-zinc-400" },
  negative: { label: "Negative",    cls: "bg-red-50 text-red-600",         dot: "bg-red-400" },
  none:     { label: "No feedback", cls: "bg-zinc-50 text-zinc-400",       dot: "bg-zinc-300" },
};

function SellerShowingLog({ leadId, sellerShowings, openHouses, onLogShowing, onLogOpenHouse }: {
  leadId: string;
  sellerShowings: SellerShowing[];
  openHouses: OpenHouse[];
  onLogShowing: () => void;
  onLogOpenHouse: () => void;
}) {
  const showings = sellerShowings.filter((s) => s.leadId === leadId)
    .sort((a, b) => b.showingDate.localeCompare(a.showingDate));
  const houses = openHouses.filter((o) => o.leadId === leadId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const positiveCount = showings.filter((s) => s.feedback === "positive").length;
  const neutralCount  = showings.filter((s) => s.feedback === "neutral").length;
  const negativeCount = showings.filter((s) => s.feedback === "negative").length;

  return (
    <Card padding="none">
      <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Showing Activity</h2>
          {showings.length > 0 && (
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{showings.length} showing{showings.length !== 1 ? "s" : ""}</span>
          )}
          {houses.length > 0 && (
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{houses.length} open house{houses.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onLogOpenHouse}
            className="text-xs text-zinc-600 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">
            + Open House
          </button>
          <button type="button" onClick={onLogShowing}
            className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">
            + Log Showing
          </button>
        </div>
      </div>

      {showings.length === 0 && houses.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">No showings or open houses logged yet.</p>
          <p className="text-xs text-zinc-300 mt-1">Log each showing to track market interest and feedback.</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          {/* Feedback summary */}
          {showings.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-zinc-500 font-medium">Feedback:</span>
              {positiveCount > 0 && <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">✓ {positiveCount} positive</span>}
              {neutralCount > 0  && <span className="text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">~ {neutralCount} neutral</span>}
              {negativeCount > 0 && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">✕ {negativeCount} negative</span>}
            </div>
          )}

          {/* Unified activity list — open houses + showings sorted by date desc */}
          {(houses.length > 0 || showings.length > 0) && (
            <div className="space-y-2">
              {/* Open houses */}
              {houses.map((oh) => (
                <div key={oh.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-200 px-1.5 py-0.5 rounded">Open House</span>
                    <span className="text-sm font-medium text-zinc-800">
                      {new Date(`${oh.date}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
                      {oh.startTime && ` · ${oh.startTime}${oh.endTime ? `–${oh.endTime}` : ""}`}
                    </span>
                    {oh.visitorCount !== undefined && (
                      <span className="text-xs text-zinc-500">{oh.visitorCount} visitors</span>
                    )}
                  </div>
                  {oh.notes && <p className="text-xs text-zinc-400 mt-1">{oh.notes}</p>}
                </div>
              ))}
              {/* Showings */}
              {showings.map((s) => {
                const fs = FEEDBACK_STYLES[s.feedback];
                return (
                  <div key={s.id} className="rounded-xl border border-zinc-100 px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-100 px-1.5 py-0.5 rounded">Showing</span>
                      <span className="text-sm font-medium text-zinc-800">
                        {new Date(`${s.showingDate}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
                        {s.showingTime && ` · ${s.showingTime}`}
                      </span>
                      {s.buyerAgentName && <span className="text-xs text-zinc-500">· {s.buyerAgentName}</span>}
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", fs.cls)}>
                        {fs.label}
                      </span>
                    </div>
                    {s.notes && <p className="text-xs text-zinc-400 mt-1">{s.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ---- Active Search Modal ----

interface ActiveSearchData {
  areasDiscussed: string;
  budgetConfirmed: string;
  financingStatus: string;
  preApproval: string;
  notes: string;
  braSigned: boolean | null;
  braDate?: string;
  braNotes?: string;
}

function ActiveSearchModal({ lead, onClose, onSubmit, isTenant = false }: { lead: Lead; onClose: () => void; onSubmit: (data: ActiveSearchData) => void; isTenant?: boolean }) {
  const [areasDiscussed, setAreasDiscussed] = useState((lead.preferredAreas ?? []).join(", "));
  const [budgetConfirmed, setBudgetConfirmed] = useState(lead.budget ?? "");
  const [financingStatus, setFinancingStatus] = useState<string>(
    isTenant
      ? (lead.applicationReadiness ?? APPLICATION_READINESS_STATUSES[0])
      : (lead.financingStatus ?? FINANCING_STATUSES[0])
  );
  const [preApproval, setPreApproval] = useState(
    lead.mortgagePreApproved ? "Yes — pre-approved" : "Not yet"
  );
  const [notes, setNotes] = useState("");
  // BRA fields (Buyer only)
  const [braSigned, setBraSigned] = useState<boolean | null>(null);
  const [braDate, setBraDate] = useState("");
  const [braNotes, setBraNotes] = useState("");

  return (
    <Modal
      title="Start Active Search"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton label="Start Active Search" disabled={!isTenant && braSigned === null}
            onClick={() => onSubmit({ areasDiscussed, budgetConfirmed, financingStatus, preApproval, notes, braSigned, braDate: braSigned === true ? braDate : undefined, braNotes: braSigned === true ? braNotes : undefined })}
          />
        </>
      }
    >
      <div>
        <label className={modalLabel}>Areas / Neighbourhoods Discussed</label>
        <input type="text" value={areasDiscussed} onChange={(e) => setAreasDiscussed(e.target.value)}
          placeholder={isTenant ? "e.g. Mill District, West End, Westgate" : "e.g. Eastside, East Village, Eastgate"} className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>{isTenant ? "Monthly Rent Budget Confirmed" : "Budget Confirmed"}</label>
        <input type="text" value={budgetConfirmed} onChange={(e) => setBudgetConfirmed(e.target.value)}
          placeholder={isTenant ? "e.g. $2,200 – $2,800/mo" : "e.g. $850,000"} className={modalInput} />
      </div>
      {isTenant ? (
        <div>
          <label className={modalLabel}>Application Readiness</label>
          <Select value={financingStatus} onChange={(e) => setFinancingStatus(e.target.value)} className={modalSelect}>
            {APPLICATION_READINESS_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      ) : (
        <>
          <div>
            <label className={modalLabel}>Financing Status</label>
            <Select value={financingStatus} onChange={(e) => setFinancingStatus(e.target.value)} className={modalSelect}>
              {FINANCING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div>
            <label className={modalLabel}>Pre-Approval</label>
            <Select value={preApproval} onChange={(e) => setPreApproval(e.target.value)} className={modalSelect}>
              {["Yes — pre-approved", "In progress", "Not yet", "Cash buyer"].map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </div>
        </>
      )}
      {!isTenant && (
        <div className="border border-zinc-200 rounded-xl px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Buyer Representation Agreement</p>
            <ComplianceTag />
          </div>
          <div>
            <label className={modalLabel}>Has the BRA been signed?</label>
            <div className="flex gap-2">
              {([true, false] as const).map((val) => (
                <button key={String(val)} type="button" onClick={() => setBraSigned(val)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                    braSigned === val
                      ? val ? "bg-emerald-600 text-white border-emerald-600" : "bg-red-500 text-white border-red-500"
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                  )}>
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
          {braSigned === true && (
            <>
              <div>
                <label className={modalLabel}>Date Signed <span className="text-red-400">*</span></label>
                <input type="date" value={braDate} onChange={(e) => setBraDate(e.target.value)} className={modalInput} />
              </div>
              <div>
                <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
                <textarea value={braNotes} onChange={(e) => setBraNotes(e.target.value)} rows={2}
                  placeholder="Any notes about the BRA…" className={modalTextarea} />
              </div>
            </>
          )}
          {braSigned === false && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-800">A reminder will be created to collect the signed BRA.</p>
            </div>
          )}
        </div>
      )}
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder={isTenant ? "Must-haves, deal-breakers, move-in flexibility…" : "Additional notes..."} className={modalTextarea} />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Active search started</p>
        <p className="text-xs text-zinc-400">· Lead will advance to Showing / Active Search</p>
        {!isTenant && braSigned === true && <p className="text-xs text-zinc-400">· BRA signed — task created to upload to the back-office system</p>}
        {!isTenant && braSigned === false && <p className="text-xs text-zinc-400">· BRA reminder created (due in 3 days)</p>}
      </div>
    </Modal>
  );
}

// ---- Offer Submitted Modal ----

interface OfferSubmittedData {
  propertyAddress: string;
  offerDate: string;
  notes: string;
  addReminderFlag: boolean;
  reminderTitle?: string;
  reminderDate?: string;
  reminderPriority?: "high" | "medium" | "low";
}

function OfferSubmittedModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: OfferSubmittedData) => void }) {
  const [propertyAddress, setPropertyAddress] = useState("");
  const [offerDate, setOfferDate] = useState(dateFromNow(0));
  const [notes, setNotes] = useState("");
  const [addReminderFlag, setAddReminderFlag] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("Follow up on offer response");
  const [reminderDate, setReminderDate] = useState(dateFromNow(1));
  const [reminderPriority, setReminderPriority] = useState<"high" | "medium" | "low">("high");

  const canSubmit = propertyAddress.trim().length > 0;

  return (
    <Modal
      title="Offer Submitted"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton label="Submit Offer" disabled={!canSubmit}
            onClick={() => onSubmit({
              propertyAddress, offerDate, notes, addReminderFlag,
              reminderTitle: addReminderFlag ? reminderTitle : undefined,
              reminderDate: addReminderFlag ? reminderDate : undefined,
              reminderPriority: addReminderFlag ? reminderPriority : undefined,
            })}
          />
        </>
      }
    >
      <div>
        <label className={modalLabel}>Property Address <span className="text-red-400">*</span></label>
        <input type="text" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)}
          placeholder="e.g. 123 Main St" className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>Offer Date</label>
        <input type="date" value={offerDate} onChange={(e) => setOfferDate(e.target.value)} className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Offer details, conditions, etc." className={modalTextarea} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Add Reminder</p>
          <Toggle on={addReminderFlag} onToggle={() => setAddReminderFlag(!addReminderFlag)} />
        </div>
        {addReminderFlag && (
          <FollowUpFields title={reminderTitle} onTitleChange={setReminderTitle}
            dueDate={reminderDate} onDueDateChange={setReminderDate}
            priority={reminderPriority} onPriorityChange={setReminderPriority} />
        )}
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Offer logged for {propertyAddress.trim() || "property"}</p>
        <p className="text-xs text-zinc-400">· Lead will advance to Offer stage</p>
        {addReminderFlag && <p className="text-xs text-zinc-400">· Follow-up reminder will be scheduled</p>}
      </div>
    </Modal>
  );
}

// ---- Deal Accepted Modal ----

interface DealAcceptedData {
  acceptedPrice: string;
  closingDate: string;
  conditionsDate: string;
  notes: string;
}

function DealAcceptedModal({ onClose, onSubmit, isSeller = false }: { onClose: () => void; onSubmit: (data: DealAcceptedData) => void; isSeller?: boolean }) {
  const [acceptedPrice, setAcceptedPrice] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [conditionsDate, setConditionsDate] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Modal
      title="Deal Accepted"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton label="Confirm Acceptance" disabled={false}
            onClick={() => onSubmit({ acceptedPrice, closingDate, conditionsDate, notes })}
          />
        </>
      }
    >
      <div>
        <label className={modalLabel}>Accepted Price</label>
        <input type="text" value={acceptedPrice} onChange={(e) => setAcceptedPrice(e.target.value)}
          placeholder="e.g. $975,000" className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>Closing Date</label>
        <input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>Conditions Date <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="date" value={conditionsDate} onChange={(e) => setConditionsDate(e.target.value)} className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Additional notes..." className={modalTextarea} />
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <p className="text-sm text-emerald-800">
          {isSeller
            ? "Offer accepted — deal moves to Under Contract. Coordinate with seller, buyer's agent and lawyers."
            : "This lead will move to Under Contract. Coordinate with all parties for a smooth closing."}
        </p>
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Deal acceptance logged</p>
        <p className="text-xs text-zinc-400">· Lead will advance to Under Contract</p>
      </div>
    </Modal>
  );
}

// ---- Offer Lost Modal ----

type OfferLossReason =
  | "outbid"
  | "conditions_not_met"
  | "client_withdrew"
  | "seller_rejected"
  | "other";

const OFFER_LOSS_REASONS: { value: OfferLossReason; label: string }[] = [
  { value: "outbid",            label: "Outbid" },
  { value: "conditions_not_met",label: "Conditions not met" },
  { value: "client_withdrew",   label: "Client withdrew" },
  { value: "seller_rejected",   label: "Seller rejected" },
  { value: "other",             label: "Other" },
];

interface OfferLostData { reason: OfferLossReason; notes: string; }

function OfferLostModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: OfferLostData) => void }) {
  const [reason, setReason] = useState<OfferLossReason>("outbid");
  const [notes, setNotes] = useState("");

  return (
    <Modal
      title="Offer Lost"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton label="Mark Offer Lost" disabled={false} onClick={() => onSubmit({ reason, notes })} />
        </>
      }
    >
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-sm text-amber-800 font-medium">Lead returns to Active Search.</p>
        <p className="text-xs text-amber-700 mt-0.5">The client is still active — they just need to find another property.</p>
      </div>
      <div>
        <label className={modalLabel}>Reason for Deactivation <span className="text-red-400">*</span></label>
        <Select
          value={reason}
          onChange={(e) => setReason(e.target.value as OfferLossReason)}
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 transition border-zinc-200 focus:ring-zinc-300"
        >
          {OFFER_LOSS_REASONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Any context for future reference..." className={modalTextarea} />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Offer lost — {OFFER_LOSS_REASONS.find(o => o.value === reason)?.label}</p>
        <p className="text-xs text-zinc-400">· Lead returns to Showing / Active Search</p>
      </div>
    </Modal>
  );
}

// ---- Mark Closed Modal ----

interface MarkClosedData {
  closedPrice: string;
  closedDate: string;
  referralPotential: string;
  notes: string;
  finalInspectionConfirmed?: boolean;
}

function MarkClosedModal({
  onClose,
  onSubmit,
  initialClosedPrice,
  initialClosedDate,
  isLandlord = false,
  isBuyer = false,
  isTenant = false,
}: {
  onClose: () => void;
  onSubmit: (data: MarkClosedData) => void;
  initialClosedPrice?: string;
  initialClosedDate?: string;
  isLandlord?: boolean;
  isBuyer?: boolean;
  isTenant?: boolean;
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [closedPrice, setClosedPrice] = useState(initialClosedPrice ?? "");
  const [closedDate, setClosedDate] = useState(initialClosedDate ?? "");
  const [referralPotential, setReferralPotential] = useState("");
  const [notes, setNotes] = useState("");
  const [finalInspectionConfirmed, setFinalInspectionConfirmed] = useState(false);
  const [inspectionError, setInspectionError] = useState(false);

  const hasPrefill = !!(initialClosedPrice || initialClosedDate);
  const closingDateInFuture = !isLandlord && !!(
    closedDate &&
    new Date(`${closedDate}T23:59:59`) > new Date()
  );
  const isLandlordOnly = isLandlord && !isTenant;
  const canSubmit = referralPotential.length > 0 && !closingDateInFuture && (!isBuyer || finalInspectionConfirmed) && (!isTenant || finalInspectionConfirmed) && (!isLandlordOnly || finalInspectionConfirmed);

  return (
    <Modal
      title="Confirm & Close Deal"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton
            label="Confirm & Close Deal"
            disabled={!canSubmit}
            onClick={() => {
              if ((isBuyer || isTenant || isLandlordOnly) && !finalInspectionConfirmed) { setInspectionError(true); return; }
              if (!canSubmit) return;
              onSubmit({ closedPrice, closedDate, referralPotential, notes, finalInspectionConfirmed });
            }}
          />
        </>
      }
    >
      {/* Framing */}
      {isLandlord ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">Lease signed and tenancy confirmed.</p>
          <p className="text-xs text-emerald-600 mt-0.5">A follow-up reminder will be created automatically based on the lease dates.</p>
        </div>
      ) : (
        <>
          {hasPrefill && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">Deal details pre-filled from accepted offer.</p>
              <p className="text-xs text-emerald-600 mt-0.5">Confirm the figures below, then set referral potential to close.</p>
            </div>
          )}
          {closingDateInFuture && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-amber-800">⚠️ Closing date has not yet passed</p>
              <p className="text-xs text-amber-700 mt-0.5">
                You can only mark a deal closed on or after the closing date. If the closing date changed, update it below first.
              </p>
            </div>
          )}
        </>
      )}

      {/* Closed price — hidden for Landlord */}
      {!isLandlord && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={cn(modalLabel, "mb-0")}>Closed Price</label>
            {!editingPrice && (
              <button type="button" onClick={() => setEditingPrice(true)}
                className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors">
                Edit
              </button>
            )}
          </div>
          {editingPrice || !initialClosedPrice ? (
            <input type="text" value={closedPrice} onChange={(e) => setClosedPrice(e.target.value)}
              placeholder="e.g. $975,000" className={modalInput} autoFocus={!initialClosedPrice} />
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">{closedPrice}</p>
              <span className="text-xs text-zinc-400">from accepted offer</span>
            </div>
          )}
        </div>
      )}

      {/* Closing date — hidden for Landlord */}
      {!isLandlord && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={cn(modalLabel, "mb-0")}>Closing Date</label>
            {!editingDate && initialClosedDate && (
              <button type="button" onClick={() => setEditingDate(true)}
                className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors">
                Edit
              </button>
            )}
          </div>
          {editingDate || !initialClosedDate ? (
            <input type="date" value={closedDate} onChange={(e) => setClosedDate(e.target.value)} className={modalInput} />
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-900">
                {new Date(`${closedDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <span className="text-xs text-zinc-400">from accepted offer</span>
            </div>
          )}
        </div>
      )}

      {/* Referral potential — required */}
      <div>
        <label className={modalLabel}>
          Referral Potential <span className="text-red-400">*</span>
        </label>
        <Select value={referralPotential} onChange={(e) => setReferralPotential(e.target.value)} className={modalSelect}>
          <option value="" disabled>Select…</option>
          {["High — very satisfied", "Medium — happy but reserved", "Low — neutral experience", "Unknown"].map((o) =>
            <option key={o} value={o}>{o}</option>
          )}
        </Select>
        {!referralPotential && (
          <p className="text-xs text-zinc-400 mt-1.5">Required — this drives post-close follow-up strategy.</p>
        )}
      </div>

      {/* Buyer inspection confirmation */}
      {isBuyer && (
        <div>
          <label className={cn(
            "flex items-start gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-colors",
            finalInspectionConfirmed ? "border-emerald-300 bg-emerald-50" : inspectionError ? "border-red-300 bg-red-50" : "border-zinc-200"
          )}>
            <div
              className={cn("mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                finalInspectionConfirmed ? "bg-emerald-600 border-emerald-600" : "border-zinc-300"
              )}
              onClick={() => { setFinalInspectionConfirmed(!finalInspectionConfirmed); setInspectionError(false); }}
            >
              {finalInspectionConfirmed && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm text-zinc-800" onClick={() => { setFinalInspectionConfirmed(!finalInspectionConfirmed); setInspectionError(false); }}>
              ✓ Final buyer inspection has been completed.
            </span>
          </label>
          {inspectionError && (
            <p className="text-xs text-red-500 mt-1.5">Please confirm the final buyer inspection was completed before closing.</p>
          )}
        </div>
      )}

      {/* Tenant final inspection confirmation */}
      {isTenant && (
        <div>
          <label className={cn(
            "flex items-start gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-colors",
            finalInspectionConfirmed ? "border-emerald-300 bg-emerald-50" : inspectionError ? "border-red-300 bg-red-50" : "border-zinc-200"
          )}>
            <div
              className={cn("mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                finalInspectionConfirmed ? "bg-emerald-600 border-emerald-600" : "border-zinc-300"
              )}
              onClick={() => { setFinalInspectionConfirmed(!finalInspectionConfirmed); setInspectionError(false); }}
            >
              {finalInspectionConfirmed && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm text-zinc-800" onClick={() => { setFinalInspectionConfirmed(!finalInspectionConfirmed); setInspectionError(false); }}>
              I completed the final inspection and key / key deposit exchange.
            </span>
          </label>
          {inspectionError && (
            <p className="text-xs text-red-500 mt-1.5">Please confirm the final inspection and key exchange were completed before closing.</p>
          )}
        </div>
      )}

      {/* Landlord final inspection confirmation */}
      {isLandlordOnly && (
        <div>
          <label className={cn(
            "flex items-start gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-colors",
            finalInspectionConfirmed ? "border-emerald-300 bg-emerald-50" : inspectionError ? "border-red-300 bg-red-50" : "border-zinc-200"
          )}>
            <div
              className={cn("mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                finalInspectionConfirmed ? "bg-emerald-600 border-emerald-600" : "border-zinc-300"
              )}
              onClick={() => { setFinalInspectionConfirmed(!finalInspectionConfirmed); setInspectionError(false); }}
            >
              {finalInspectionConfirmed && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm text-zinc-800" onClick={() => { setFinalInspectionConfirmed(!finalInspectionConfirmed); setInspectionError(false); }}>
              I completed the final inspection and key / key deposit exchange.
            </span>
          </label>
          {inspectionError && (
            <p className="text-xs text-red-500 mt-1.5">Please confirm the final inspection and key exchange were completed before closing.</p>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Any final notes on the deal…" className={modalTextarea} />
      </div>

      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· {isLandlord ? "Tenancy established" : "Transaction closed"}</p>
        <p className="text-xs text-zinc-400">· Lead will advance to Closed</p>
        {isLandlord && <p className="text-xs text-zinc-400">· Move-in check-in reminder created (move-in + 7 days)</p>}
      </div>
    </Modal>
  );
}

// ---- Complete Task Modal ----

function CompleteTaskModal({
  reminder,
  onClose,
  onSubmit,
}: {
  reminder: Reminder;
  onClose: () => void;
  onSubmit: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const trimmed = notes.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < OUTCOME_NOTE_MIN_LENGTH;
  const canSubmit = trimmed.length >= OUTCOME_NOTE_MIN_LENGTH;

  return (
    <Modal
      title="Complete Task"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton
            label="Mark Done"
            disabled={!canSubmit}
            onClick={() => { if (!canSubmit) return; onSubmit(trimmed); }}
          />
        </>
      }
    >
      {/* Task context */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Task</p>
        <p className="text-sm font-medium text-zinc-800">{reminder.title}</p>
        <p className="text-xs text-zinc-400 mt-0.5">Due {formatDate(reminder.dueDate)}</p>
      </div>

      {/* Outcome note */}
      <div>
        <label className={modalLabel}>
          What happened? <span className="text-red-400">*</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Briefly describe what happened — call outcome, client response, next step agreed…"
          className={modalTextarea}
          autoFocus
        />
        {tooShort && (
          <p className="text-xs text-red-500 mt-1.5">
            A few more words — {OUTCOME_NOTE_MIN_LENGTH - trimmed.length} character
            {OUTCOME_NOTE_MIN_LENGTH - trimmed.length === 1 ? "" : "s"} needed.
          </p>
        )}
      </div>
    </Modal>
  );
}

// ---- Set Follow-Up Modal ----

interface FollowUpData {
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  note: string;
}

function SetFollowUpModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: FollowUpData) => void }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [note, setNote] = useState("");

  const canSubmit = title.trim().length > 0 && dueDate.length > 0;

  return (
    <Modal
      title="Set Follow-Up Reminder"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton label="Set Reminder" disabled={!canSubmit}
            onClick={() => { if (!canSubmit) return; onSubmit({ title, dueDate, priority, note }); }}
          />
        </>
      }
    >
      <div>
        <label className={modalLabel}>Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Follow up on listing feedback" className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>Due Date</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={modalInput} />
      </div>
      <div>
        <label className={modalLabel}>Priority</label>
        <PriorityChips value={priority} onChange={setPriority} />
      </div>
      <div>
        <label className={modalLabel}>Note <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          placeholder="Additional context..."
          className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2.5 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 resize-none"
        />
      </div>
    </Modal>
  );
}

// ---- Move Back One Stage Modal ----

function MoveBackModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title="Move Back One Stage"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton label="Confirm Move Back" disabled={false}
            onClick={() => onSubmit(reason)}
          />
        </>
      }
    >
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-amber-800">This will move the lead back one stage.</p>
        <p className="text-xs text-amber-600 mt-0.5">Use this to correct a stage that was advanced by mistake, or to revisit a step before moving forward again.</p>
      </div>
      <div>
        <label className={modalLabel}>Reason <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="e.g. Submitted discovery too early — need to re-confirm client timeline…"
          className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2.5 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 resize-none"
          autoFocus
        />
      </div>
    </Modal>
  );
}

// ---- Schedule Showing Modal ----

interface ScheduleShowingFormData {
  mlsNumber: string;
  address: string;
  scheduledDate: string;   // YYYY-MM-DD
  scheduledTime: string;   // HH:MM
  preVisitNotes: string;
  priority: "high" | "medium" | "low";
}

function ScheduleShowingModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: ScheduleShowingFormData) => void;
}) {
  const [mlsNumber, setMlsNumber] = useState("");
  const [address, setAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState(dateFromNow(1));
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [preVisitNotes, setPreVisitNotes] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  const canSubmit = address.trim().length > 0 && scheduledDate.length > 0;

  return (
    <Modal
      title="Schedule Showing"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton
            label="Schedule Showing"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onSubmit({ mlsNumber, address, scheduledDate, scheduledTime, preVisitNotes, priority });
            }}
          />
        </>
      }
    >
      <div>
        <label className={modalLabel}>
          Address <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 402 Elm St"
          className={modalInput}
        />
      </div>
      <div>
        <label className={modalLabel}>
          MLS # <span className="normal-case text-zinc-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={mlsNumber}
          onChange={(e) => setMlsNumber(e.target.value)}
          placeholder="e.g. E8123456"
          className={modalInput}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={modalLabel}>
            Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className={modalInput}
          />
        </div>
        <div>
          <label className={modalLabel}>Time</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className={modalInput}
          />
        </div>
      </div>
      <div>
        <label className={modalLabel}>
          Pre-visit notes <span className="normal-case text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={preVisitNotes}
          onChange={(e) => setPreVisitNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Client wants min. 3BR, must have backyard, check basement height"
          className={modalTextarea}
        />
      </div>
      <div>
        <label className={modalLabel}>Priority</label>
        <PriorityChips value={priority} onChange={setPriority} />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Showing task created for {address.trim() || "property"}</p>
        <p className="text-xs text-zinc-400">· Will appear in Tasks — mark Done after the visit to log it</p>
      </div>
    </Modal>
  );
}

// ---- Complete Showing Modal ----

interface CompleteShowingData {
  mlsNumber: string;
  address: string;
  visitDate: string;
  notes: string;
}

function CompleteShowingModal({
  showingTask,
  onClose,
  onSubmit,
}: {
  showingTask: ShowingTask;
  onClose: () => void;
  onSubmit: (data: CompleteShowingData) => void;
}) {
  const [mlsNumber, setMlsNumber] = useState(showingTask.mlsNumber ?? "");
  const [address, setAddress] = useState(showingTask.address);
  const [visitDate, setVisitDate] = useState(showingTask.scheduledDate.split("T")[0]);
  const [notes, setNotes] = useState("");

  const canSubmit = notes.trim().length > 0;

  return (
    <Modal
      title="Log Showing — What Happened?"
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton
            label="Log Showing"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onSubmit({ mlsNumber, address, visitDate, notes });
            }}
          />
        </>
      }
    >
      {/* Pre-filled context — editable in case details changed */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 space-y-2">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Pre-filled from scheduled task</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={modalLabel}>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={modalInput}
            />
          </div>
          <div>
            <label className={modalLabel}>MLS #</label>
            <input
              type="text"
              value={mlsNumber}
              onChange={(e) => setMlsNumber(e.target.value)}
              placeholder="Optional"
              className={modalInput}
            />
          </div>
        </div>
        <div>
          <label className={modalLabel}>Date of Visit</label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className={modalInput}
          />
        </div>
        {showingTask.preVisitNotes && (
          <p className="text-xs text-zinc-500 italic">Pre-visit note: {showingTask.preVisitNotes}</p>
        )}
      </div>

      {/* The one thing the agent fills in */}
      <div>
        <label className={modalLabel}>
          What happened? <span className="text-red-400">*</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Client reactions, concerns, next steps, likelihood of offer…"
          className={modalTextarea}
          autoFocus
        />
      </div>
    </Modal>
  );
}

// ---- Showing Modal (add & edit) ----

interface ShowingFormData {
  mlsNumber: string;
  address: string;
  visitDate: string;
  notes: string;
}

function ShowingModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: Showing;
  onClose: () => void;
  onSubmit: (data: ShowingFormData) => void;
}) {
  const [mlsNumber, setMlsNumber] = useState(initial?.mlsNumber ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [visitDate, setVisitDate] = useState(initial?.visitDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const canSubmit = address.trim().length > 0 && visitDate.length > 0;
  const isEdit = !!initial;

  return (
    <Modal
      title={isEdit ? "Edit Showing" : "Log Showing"}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClose={onClose} />
          <SubmitButton
            label={isEdit ? "Save Changes" : "Log Showing"}
            disabled={!canSubmit}
            onClick={() => { if (!canSubmit) return; onSubmit({ mlsNumber, address, visitDate, notes }); }}
          />
        </>
      }
    >
      <div>
        <label className={modalLabel}>
          MLS # <span className="normal-case text-zinc-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={mlsNumber}
          onChange={(e) => setMlsNumber(e.target.value)}
          placeholder="e.g. E8123456"
          className={modalInput}
        />
      </div>
      <div>
        <label className={modalLabel}>
          Address <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 215 Cedar Ave"
          className={modalInput}
        />
      </div>
      <div>
        <label className={modalLabel}>
          Date of Visit <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          className={modalInput}
        />
      </div>
      <div>
        <label className={modalLabel}>
          Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="What happened at this showing? Client reactions, concerns, next steps…"
          className={modalTextarea}
        />
      </div>
    </Modal>
  );
}

// ---- Notes Card ----

function NotesCard({ activities, onAdd }: {
  activities: Activity[];
  onAdd: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const notes = activities
    .filter((a) => a.type === "note")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText("");
    setOpen(false);
  };

  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900">Notes</h2>
        <button type="button" onClick={() => { setOpen(!open); setText(""); }}
          className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">
          {open ? "Cancel" : "+ Add Note"}
        </button>
      </div>

      {open && (
        <div className="px-5 py-3 border-b border-zinc-100 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Write a note about this lead…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition resize-none"
          />
          <button type="button" onClick={handleSubmit} disabled={!text.trim()}
            className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${text.trim() ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"}`}>
            Save Note
          </button>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-zinc-400">No notes yet.</p>
          <p className="text-xs text-zinc-300 mt-0.5">Add a note to capture anything worth remembering.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {notes.map((n) => {
            const source = n.title?.startsWith("Note — ") ? n.title.slice(7) : null;
            return (
              <li key={n.id} className="px-5 py-3.5">
                {source && (
                  <span className="inline-block text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5 mb-1.5 uppercase tracking-wide">
                    {source}
                  </span>
                )}
                <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">{n.description}</p>
                <p className="text-xs text-zinc-400 mt-1.5">{n.createdBy} · {new Date(n.createdAt).toLocaleString("en-CA", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ---- Showing Log Section ----

function ShowingLogSection({
  showings,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
}: {
  showings: Showing[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (s: Showing) => void;
  onDelete: (s: Showing) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sort: earliest visit date first
  const sorted = [...showings].sort((a, b) =>
    new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
  );

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const fmtVisitDate = (dateStr: string) =>
    new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <Card padding="none">
      <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Showing Log</h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
            {showings.length}
          </span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onAdd}
            className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors"
          >
            + Add Showing
          </button>
        )}
      </div>

      {showings.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">No showings logged yet.</p>
          {canEdit && (
            <p className="text-xs text-zinc-300 mt-1">
              Log the first showing once visits begin.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {sorted.map((s) => {
            const isExpanded = expandedIds.has(s.id);
            const isConfirmingDelete = confirmDeleteId === s.id;
            // ~50 chars ≈ one line at text-xs in this card width.
            // Anything longer gets a Show more/less toggle.
            const hasLongNote = (s.notes?.length ?? 0) > 50;

            return (
              <li key={s.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Address + MLS */}
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">{s.address}</p>
                      {s.mlsNumber && (
                        <span className="text-[11px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded font-mono">
                          MLS# {s.mlsNumber}
                        </span>
                      )}
                    </div>
                    {/* Date */}
                    <p className="text-xs text-zinc-400 mt-0.5">{fmtVisitDate(s.visitDate)}</p>
                    {/* Notes */}
                    {s.notes && (
                      <div className="mt-1.5">
                        <p
                          className={cn(
                            "text-xs text-zinc-500 leading-relaxed break-words",
                            !isExpanded && "line-clamp-2"
                          )}
                        >
                          {s.notes}
                        </p>
                        {hasLongNote && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(s.id)}
                            className="text-[11px] text-zinc-400 hover:text-zinc-600 mt-0.5 transition-colors"
                          >
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons — edit mode only */}
                  {canEdit && (
                    <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                      {isConfirmingDelete ? (
                        <>
                          <button
                            type="button"
                            onClick={() => { onDelete(s); setConfirmDeleteId(null); }}
                            className="text-xs text-red-600 border border-red-200 rounded-md px-2.5 py-1 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit(s)}
                            className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 rounded-md px-2.5 py-1 hover:border-zinc-300 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(s.id)}
                            className="text-xs text-zinc-400 hover:text-red-600 border border-zinc-200 rounded-md px-2.5 py-1 hover:border-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ---- Under Contract Checklist ----

const UNDER_CONTRACT_CHECKLIST_TASKS = [
  "Send Buying Document Package to client",
  "Send Buying Document Package to lawyer",
  "Update documents in the back-office system",
  "Send Information Package to client",
] as const;

// Helper for checklist date display
const fmtChecklistDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

// Shared checkmark SVG
function CheckSVG() {
  return (
    <svg className="w-3 h-3 text-white" viewBox="0 0 12 10" fill="none">
      <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Under Contract Checklist Modal ----

interface TaskLocalState {
  mode: "default" | "reminding" | "inclusions";
  reminderDate: string;
  reminderTime: string;
  note: string;
  idConfirmed: boolean;
  inclusions: string;
  exclusions: string;
}

const SELLER_ID_TASK = "Verify seller identity (ID confirmed — seller is registered owner)";
const INCLUSIONS_TASK = "Inclusions & Exclusions documented";

function UnderContractChecklistModal({
  items,
  onComplete,
  onRemind,
  onClose,
  onSaveInclusionsExclusions,
  title = "Under Contract — Action Checklist",
}: {
  items: ChecklistItem[];
  onComplete: (id: string, note?: string) => void;
  onRemind: (id: string, dueDate: string) => void;
  onClose: () => void;
  title?: string;
  onSaveInclusionsExclusions?: (inclusions: string, exclusions: string) => void;
}) {
  const [taskStates, setTaskStates] = useState<Record<string, TaskLocalState>>(
    () => Object.fromEntries(
      items.map((item) => [item.id, { mode: "default", reminderDate: "", reminderTime: "09:00", note: "", idConfirmed: false, inclusions: "", exclusions: "" }])
    )
  );

  const doneCount = items.filter((i) => i.status === "done").length;
  const allDone = doneCount === items.length;

  const patchTask = (id: string, patch: Partial<TaskLocalState>) =>
    setTaskStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleConfirmReminder = (item: ChecklistItem) => {
    const ts = taskStates[item.id];
    if (!ts.reminderDate) return;
    const dueDate = new Date(`${ts.reminderDate}T${ts.reminderTime}:00`).toISOString();
    onRemind(item.id, dueDate);
    patchTask(item.id, { mode: "default" });
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
          {allDone ? "All done — close" : "Done for now"}
        </button>
      }
    >
      {/* Framing */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-blue-800">Standard tasks for this stage</p>
        <p className="text-xs text-blue-600 mt-0.5">Mark each task done or set a reminder to action it later.</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${(doneCount / items.length) * 100}%` }} />
        </div>
        <span className="text-xs font-medium text-zinc-500 shrink-0">{doneCount} of {items.length}</span>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {items.map((item) => {
          const isDone = item.status === "done";
          const hasReminder = !!item.reminderDueDate && !isDone;
          const ts = taskStates[item.id] ?? { mode: "default", reminderDate: "", reminderTime: "09:00", note: "" };
          const isReminding = ts.mode === "reminding";

          // ── Done state ───────────────────────────────────────────────────
          if (isDone) {
            return (
              <div key={item.id} className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 h-5 w-5 rounded bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center">
                    <CheckSVG />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-400 line-through">{item.name}</p>
                    {item.completedAt && (
                      <p className="text-xs text-zinc-400 mt-0.5">Done {fmtChecklistDate(item.completedAt)}</p>
                    )}
                    {item.optionalNote && (
                      <p className="text-xs text-zinc-400 mt-0.5 italic">{item.optionalNote}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // ── Reminder set, not yet done ────────────────────────────────────
          if (hasReminder) {
            return (
              <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50/30 px-4 py-3 space-y-2.5">
                <div className="flex items-start gap-3">
                  <span className="text-base mt-0.5 shrink-0">🔔</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800">{item.name}</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Reminder: {fmtChecklistDate(item.reminderDueDate!)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-8">
                  <button type="button"
                    onClick={() => onComplete(item.id, ts.note || undefined)}
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 transition-colors">
                    ✅ Mark Done
                  </button>
                  <input type="text" value={ts.note} onChange={(e) => patchTask(item.id, { note: e.target.value })}
                    placeholder="Optional note…"
                    className="flex-1 text-xs border-0 border-b border-zinc-200 bg-transparent placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 py-0.5 transition-colors" />
                </div>
              </div>
            );
          }

          // ── Reminding (date picker open) ───────────────────────────────────
          if (isReminding) {
            return (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-2.5">
                <p className="text-sm font-medium text-zinc-800">{item.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Date</p>
                    <input type="date" value={ts.reminderDate}
                      onChange={(e) => patchTask(item.id, { reminderDate: e.target.value })}
                      className="w-full text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Time</p>
                    <input type="time" value={ts.reminderTime}
                      onChange={(e) => patchTask(item.id, { reminderTime: e.target.value })}
                      className="w-full text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-300" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    disabled={!ts.reminderDate}
                    onClick={() => handleConfirmReminder(item)}
                    className={cn(
                      "text-xs font-medium rounded-lg px-2.5 py-1.5 transition-colors",
                      ts.reminderDate
                        ? "bg-zinc-900 text-white hover:bg-zinc-800"
                        : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                    )}>
                    Set Reminder
                  </button>
                  <button type="button"
                    onClick={() => patchTask(item.id, { mode: "default" })}
                    className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          // ── Inclusions & Exclusions mode ──────────────────────────────────
          if (ts.mode === "inclusions") {
            const fi2 = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition mt-1";
            return (
              <div key={item.id} className="rounded-xl border border-sky-200 bg-sky-50/40 px-4 py-3 space-y-3">
                <p className="text-sm font-medium text-zinc-800">{item.name}</p>
                <div>
                  <p className="text-xs font-medium text-zinc-500">What is included in the sale? <span className="font-normal text-zinc-400">(optional)</span></p>
                  <textarea value={ts.inclusions} onChange={(e) => patchTask(item.id, { inclusions: e.target.value })}
                    rows={2} placeholder="e.g. fridge, stove, washer/dryer, window coverings, ELFs" className={fi2} />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">What is excluded from the sale? <span className="font-normal text-zinc-400">(optional)</span></p>
                  <textarea value={ts.exclusions} onChange={(e) => patchTask(item.id, { exclusions: e.target.value })}
                    rows={2} placeholder="e.g. dining room chandelier, backyard shed, garage shelving" className={fi2} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => {
                      const combined = [
                        ts.inclusions.trim() && `Inclusions: ${ts.inclusions.trim()}`,
                        ts.exclusions.trim() && `Exclusions: ${ts.exclusions.trim()}`,
                      ].filter(Boolean).join(" | ");
                      onSaveInclusionsExclusions?.(ts.inclusions.trim(), ts.exclusions.trim());
                      onComplete(item.id, combined || undefined);
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 transition-colors">
                    ✅ Confirm & Mark Done
                  </button>
                  <button type="button" onClick={() => patchTask(item.id, { mode: "default" })}
                    className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          // ── Default (open, no reminder, picker closed) ─────────────────────
          const isSellerIDTask = item.name === SELLER_ID_TASK;
          const isInclusionsTask = item.name === INCLUSIONS_TASK;
          const subText = CHECKLIST_ITEM_SUBTEXTS[item.name];
          return (
            <div key={item.id} className={`rounded-xl border px-4 py-3 space-y-2.5 ${isSellerIDTask ? "border-amber-200 bg-amber-50/30" : "border-zinc-200"}`}>
              <p className="text-sm font-medium text-zinc-800">{item.name}</p>
              {isSellerIDTask && <ComplianceTag className="-mt-1" />}
              {subText && <p className="text-xs text-zinc-400 leading-relaxed -mt-1">{subText}</p>}
              {!isSellerIDTask && !isInclusionsTask && (
                <input type="text" value={ts.note} onChange={(e) => patchTask(item.id, { note: e.target.value })}
                  placeholder="Optional note…"
                  className="w-full text-xs border-0 border-b border-zinc-200 bg-transparent placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 py-0.5 transition-colors" />
              )}
              {isSellerIDTask && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={ts.idConfirmed} onChange={(e) => patchTask(item.id, { idConfirmed: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 shrink-0" />
                  <span className="text-xs text-amber-800 leading-relaxed font-medium">
                    Confirm: I have reviewed the seller&apos;s government-issued ID and confirmed they are the registered owner of this property.
                  </span>
                </label>
              )}
              <div className="flex items-center gap-2">
                {isInclusionsTask ? (
                  <button type="button"
                    onClick={() => patchTask(item.id, { mode: "inclusions" })}
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 transition-colors">
                    ✅ Mark Done
                  </button>
                ) : (
                  <button type="button"
                    disabled={isSellerIDTask && !ts.idConfirmed}
                    onClick={() => { if (isSellerIDTask && !ts.idConfirmed) return; onComplete(item.id, ts.note || undefined); }}
                    className={`flex items-center gap-1.5 text-xs font-medium border rounded-lg px-2.5 py-1.5 transition-colors ${isSellerIDTask && !ts.idConfirmed ? "text-zinc-400 border-zinc-200 cursor-not-allowed" : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"}`}>
                    ✅ Mark Done
                  </button>
                )}
                <button type="button"
                  onClick={() => patchTask(item.id, { mode: "reminding" })}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">
                  🔔 Remind Me Later
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ---- Under Contract Checklist Panel ----

function UnderContractChecklistPanel({
  items,
  onComplete,
  onOpenModal,
  title = "Under Contract Checklist",
}: {
  items: ChecklistItem[];
  onComplete: (id: string, note?: string) => void;
  onOpenModal: () => void;
  title?: string;
}) {
  if (items.length === 0) return null;
  const doneCount = items.filter((i) => i.status === "done").length;
  const allDone = doneCount === items.length;

  return (
    <Card padding="none">
      <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            allDone ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
          )}>
            {doneCount} of {items.length}
          </span>
        </div>
        {!allDone && (
          <button type="button" onClick={onOpenModal}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
            Open checklist →
          </button>
        )}
      </div>

      <ul className="divide-y divide-zinc-100">
        {items.map((item) => {
          const isDone = item.status === "done";
          const hasReminder = !!item.reminderDueDate && !isDone;
          return (
            <li key={item.id} className="px-5 py-3">
              {isDone ? (
                // Done row
                <div className="flex items-center gap-3 opacity-60">
                  <div className="shrink-0 h-5 w-5 rounded bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center">
                    <CheckSVG />
                  </div>
                  <p className="text-sm text-zinc-400 line-through flex-1">{item.name}</p>
                </div>
              ) : hasReminder ? (
                // Reminder set row — show date + Mark Done
                <div className="flex items-center gap-3">
                  <span className="text-base shrink-0">🔔</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700">{item.name}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Reminder: {fmtChecklistDate(item.reminderDueDate!)}</p>
                  </div>
                  <button type="button" onClick={() => onComplete(item.id)}
                    className="text-xs text-emerald-700 border border-emerald-200 rounded-md px-2.5 py-1 hover:bg-emerald-50 transition-colors shrink-0">
                    Done ✓
                  </button>
                </div>
              ) : (
                // Pending row — click opens modal
                <button type="button" onClick={onOpenModal}
                  className="flex items-center gap-3 w-full text-left group">
                  <div className="shrink-0 h-5 w-5 rounded border-2 border-zinc-300 group-hover:border-zinc-400 bg-white transition-colors" />
                  <p className="text-sm text-zinc-700 flex-1">{item.name}</p>
                  <span className="text-xs text-zinc-300 group-hover:text-zinc-400 transition-colors">→</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Progress bar footer */}
      <div className="px-5 py-2.5 border-t border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${(doneCount / items.length) * 100}%` }} />
          </div>
          <span className="text-xs text-zinc-400">{doneCount}/{items.length}</span>
        </div>
      </div>
    </Card>
  );
}

// ---- Sign Listing Agreement Modal (Seller: Appointment Scheduled → Pre-Listing) ----

interface SignListingData {
  signedDate: string;
  expiryDate: string;
  expectedPrice: string;
  targetListDate: string;
  notes: string;
}

function SignListingAgreementModal({ onClose, onSubmit, isLandlord = false, initialPrice = "" }: { onClose: () => void; onSubmit: (data: SignListingData) => void; isLandlord?: boolean; initialPrice?: string }) {
  const [signedDate, setSignedDate] = useState(dateFromNow(0));
  const [expiryDate, setExpiryDate] = useState("");
  const [expectedPrice, setExpectedPrice] = useState(initialPrice);
  const [targetListDate, setTargetListDate] = useState("");
  const [notes, setNotes] = useState("");
  const canSubmit = expiryDate.length > 0;

  const priceLabel = isLandlord ? "Expected Monthly Rent" : "Expected Price";
  const pricePlaceholder = isLandlord ? "e.g. $2,500/mo, $3,000/mo" : "e.g. $850,000";

  return (
    <Modal title="Sign Listing Agreement" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Sign & Move to Pre-Listing" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ signedDate, expiryDate, expectedPrice, targetListDate, notes }); }} /></>}>
      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-sky-800">Listing agreement signed — lead moves to Pre-Listing.</p>
        <p className="text-xs text-sky-600 mt-0.5">Pre-listing prep checklist will be created automatically.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={modalLabel}>Signed Date</label>
          <input type="date" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} className={modalInput} />
        </div>
        <div>
          <label className={modalLabel}>Expiry Date <span className="text-red-400">*</span></label>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={modalInput} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={modalLabel}>{priceLabel} <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="text" value={expectedPrice} onChange={(e) => setExpectedPrice(e.target.value)} placeholder={pricePlaceholder} className={modalInput} />
        </div>
        <div>
          <label className={modalLabel}>Target List Date <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="date" value={targetListDate} onChange={(e) => setTargetListDate(e.target.value)} className={modalInput} />
        </div>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any notes on the agreement…" className={modalTextarea} />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Listing agreement recorded</p>
        <p className="text-xs text-zinc-400">· Lead moves to Pre-Listing</p>
        <p className="text-xs text-zinc-400">· Pre-listing prep checklist created (5 tasks)</p>
      </div>
    </Modal>
  );
}

// ---- List on MLS Modal (Seller: Pre-Listing → Listed / Active) ----

interface ListOnMLSData {
  mlsNumber: string;
  actualListDate: string;
  finalListPrice: string;
  notes: string;
}

function ListOnMLSModal({ onClose, onSubmit, isLandlord = false }: { onClose: () => void; onSubmit: (data: ListOnMLSData) => void; isLandlord?: boolean }) {
  const [mlsNumber, setMlsNumber] = useState("");
  const [actualListDate, setActualListDate] = useState(dateFromNow(0));
  const [finalListPrice, setFinalListPrice] = useState("");
  const [notes, setNotes] = useState("");
  const canSubmit = actualListDate.length > 0;

  return (
    <Modal title={isLandlord ? "List for Rent" : "List on MLS"} onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="List & Move to Listed / Active" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ mlsNumber, actualListDate, finalListPrice, notes }); }} /></>}>
      <div>
        <label className={modalLabel}>MLS # <span className="normal-case text-zinc-400 font-normal">(optional — add when confirmed)</span></label>
        <input type="text" value={mlsNumber} onChange={(e) => setMlsNumber(e.target.value)} placeholder="e.g. C12345678" className={modalInput} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={modalLabel}>List Date <span className="text-red-400">*</span></label>
          <input type="date" value={actualListDate} onChange={(e) => setActualListDate(e.target.value)} className={modalInput} />
        </div>
        <div>
          <label className={modalLabel}>{isLandlord ? "Monthly Rent" : "Final List Price"} <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="text" value={finalListPrice} onChange={(e) => setFinalListPrice(e.target.value)} placeholder={isLandlord ? "e.g. $2,800" : "e.g. $849,900"} className={modalInput} />
        </div>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional notes…" className={modalTextarea} />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1.5">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· {isLandlord ? "Property listed for rent" : "Property listed on MLS"}</p>
        <p className="text-xs text-zinc-400">· Lead moves to Listed / Active</p>
      </div>
    </Modal>
  );
}

// ---- Seller Offer Lost Modal (Seller: re-list vs. lost) ----

interface SellerOfferLostData {
  reListing: boolean;
  lossReason?: string;
  notes: string;
}

function SellerOfferLostModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: SellerOfferLostData) => void }) {
  const [reListing, setReListing] = useState<boolean | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [notes, setNotes] = useState("");
  const canSubmit = reListing === true || (reListing === false && lossReason.length > 0);

  return (
    <Modal title="Offer Lost" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Confirm" disabled={!canSubmit} onClick={() => { if (!canSubmit || reListing === null) return; onSubmit({ reListing, lossReason: reListing ? undefined : lossReason, notes }); }} /></>}>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Offer fell through. Is the seller re-listing?</p>
      </div>
      <div className="flex gap-3">
        {[{ v: true, label: "Yes — re-listing" }, { v: false, label: "No — end relationship" }].map(({ v, label }) => (
          <button key={String(v)} type="button" onClick={() => setReListing(v)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors",
              reListing === v ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
            )}>
            {label}
          </button>
        ))}
      </div>
      {reListing === false && (
        <div>
          <label className={modalLabel}>Reason for Deactivation <span className="text-red-400">*</span></label>
          <select value={lossReason} onChange={(e) => setLossReason(e.target.value)} className={modalSelect}>
            <option value="" disabled>Select…</option>
            {SELLER_LOSS_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any context…" className={modalTextarea} />
      </div>
    </Modal>
  );
}

// ---- Listing Expired / Withdrawn Modal ----

interface ListingExpiredData {
  action: "relist" | "lost";
  lossReason?: string;
  notes: string;
}

function ListingExpiredWithdrawnModal({
  onClose, onSubmit,
  lossReasons = SELLER_LOSS_REASONS,
}: {
  onClose: () => void;
  onSubmit: (data: ListingExpiredData) => void;
  lossReasons?: { value: string; label: string }[];
}) {
  const [action, setAction] = useState<"relist" | "lost" | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [notes, setNotes] = useState("");
  const canSubmit = action === "relist" || (action === "lost" && lossReason.length > 0);

  return (
    <Modal title="Listing Expired / Withdrawn" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Confirm" disabled={!canSubmit} onClick={() => { if (!canSubmit || !action) return; onSubmit({ action, lossReason: action === "lost" ? lossReason : undefined, notes }); }} /></>}>
      <p className="text-sm text-zinc-600">What would you like to do with this listing?</p>
      <div className="flex gap-3">
        {[{ v: "relist" as const, label: "Re-listing" }, { v: "lost" as const, label: "Mark as Lost" }].map(({ v, label }) => (
          <button key={v} type="button" onClick={() => setAction(v)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors",
              action === v ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
            )}>
            {label}
          </button>
        ))}
      </div>
      {action === "relist" && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
          <p className="text-sm text-sky-800">Lead returns to Pre-Listing. Prep checklist will be re-created and a new listing agreement is required.</p>
        </div>
      )}
      {action === "lost" && (
        <div>
          <label className={modalLabel}>Reason for Deactivation <span className="text-red-400">*</span></label>
          <select value={lossReason} onChange={(e) => setLossReason(e.target.value)} className={modalSelect}>
            <option value="" disabled>Select…</option>
            {lossReasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any context…" className={modalTextarea} />
      </div>
    </Modal>
  );
}

// ---- BRA Required Modal ----

function BraRequiredModal({ onClose, onLogBra }: { onClose: () => void; onLogBra: () => void }) {
  return (
    <Modal title="BRA Required" onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onLogBra}
            className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors">
            Log BRA Now
          </button>
        </>
      }>
      <ComplianceTag />
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-red-800">You cannot submit an offer without a signed Buyer Representation Agreement on file. This is a regulatory compliance step. Please log the signed BRA first.</p>
      </div>
    </Modal>
  );
}

// ---- Log BRA Modal ----

interface LogBraData {
  braDate: string;
  braExpiryDate: string;
  braNotes: string;
  uploadedToBackOffice: boolean;
}

function LogBraModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: LogBraData) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [braDate, setBraDate] = useState(today);
  const [braExpiryDate, setBraExpiryDate] = useState("");
  const [braNotes, setBraNotes] = useState("");
  const [uploadedToBackOffice, setUploadedToBackOffice] = useState(false);
  const canSubmit = braDate.length > 0 && braExpiryDate.length > 0 && uploadedToBackOffice;

  const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5";

  return (
    <Modal title="Log Signed BRA" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Log BRA" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ braDate, braExpiryDate, braNotes, uploadedToBackOffice }); }} /></>}>
      <ComplianceTag />
      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-sky-800">Log the signed Buyer Representation Agreement to proceed.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Date Signed <span className="text-red-400">*</span></label>
          <input type="date" value={braDate} onChange={(e) => setBraDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Expiry Date <span className="text-red-400">*</span></label>
          <input type="date" value={braExpiryDate} onChange={(e) => setBraExpiryDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={braNotes} onChange={(e) => setBraNotes(e.target.value)} rows={2}
          placeholder="Any context about the BRA…"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition resize-none" />
      </div>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" checked={uploadedToBackOffice} onChange={(e) => setUploadedToBackOffice(e.target.checked)}
          className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400" />
        <span className="text-sm text-zinc-700">Have you uploaded the BRA to the back-office system?</span>
      </label>
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· BRA signed — {braDate || "date"}{braExpiryDate ? `, expires ${braExpiryDate}` : ""}</p>
        <p className="text-xs text-zinc-400">· BRA uploaded to the back-office system confirmed</p>
      </div>
    </Modal>
  );
}

// ---- Landlord Lost Modal ----

interface LandlordLostData { reason: string; notes: string; }

function LandlordLostModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: LandlordLostData) => void }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const canSubmit = reason.length > 0;

  return (
    <Modal title="Mark Lead as Inactive" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Mark as Inactive" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ reason, notes }); }} /></>}>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Lead will be marked as Inactive.</p>
        <p className="text-xs text-amber-700 mt-0.5">You can reactivate this lead at any time.</p>
      </div>
      <div>
        <label className={modalLabel}>Reason for Deactivation <span className="text-red-400">*</span></label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={modalSelect}>
          <option value="" disabled>Select…</option>
          {LANDLORD_LOSS_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any context for future reference…" className={modalTextarea} />
      </div>
    </Modal>
  );
}

// ---- Recruit: Begin In-Person Meeting Modal ----

function RecruitMeetingModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (notes: string) => void }) {
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Begin In-Person Meeting" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Start Conversation" disabled={false} onClick={() => onSubmit(notes)} /></>}>
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-violet-800">Starting recruiting conversation with this agent.</p>
        <p className="text-xs text-violet-600 mt-0.5">Stage will advance to In Conversation.</p>
      </div>
      <div>
        <label className={modalLabel}>Meeting Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Topics discussed, agent's questions, initial impressions…" className={modalTextarea} autoFocus />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· In-person meeting logged</p>
        <p className="text-xs text-zinc-400">· Stage advances to In Conversation</p>
      </div>
    </Modal>
  );
}

// ---- Recruit: Extend Offer Modal ----

function RecruitExtendOfferModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (notes: string) => void }) {
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Extend Offer to Recruit" onClose={onClose}
      footer={<><CancelButton onClose={onClose} /><SubmitButton label="Extend Offer" disabled={false} onClick={() => onSubmit(notes)} /></>}>
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-zinc-800">A formal offer will be extended to this recruit.</p>
        <p className="text-xs text-zinc-500 mt-0.5">Use the Offer panel below to log commission split and terms.</p>
      </div>
      <div>
        <label className={modalLabel}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Any verbal terms discussed before the formal offer…" className={modalTextarea} autoFocus />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Offer extended to recruit</p>
        <p className="text-xs text-zinc-400">· Stage advances to Offer Extended</p>
        <p className="text-xs text-zinc-400">· Log offer details in the panel that appears below</p>
      </div>
    </Modal>
  );
}

// ---- Pending Conditions Modal ----

function PendingConditionsModal({
  conditions,
  onResolve,
  onClose,
}: {
  conditions: OfferCondition[];
  onResolve: (condId: string, resolution: "waived") => void;
  onClose: () => void;
}) {
  const pendingCount = conditions.filter((c) => c.resolution === "pending").length;

  return (
    <Modal
      title="Open Conditions — Deal Not Yet Firm"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
          Resolve Later
        </button>
      }
    >
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-amber-800">
          {pendingCount} condition{pendingCount !== 1 ? "s" : ""} must be resolved before advancing to Under Contract.
        </p>
        <p className="text-xs text-amber-600 mt-0.5">Mark each as Waived to proceed.</p>
      </div>

      <div className="space-y-2">
        {conditions.map((cond) => {
          const label = cond.conditionType === "other" && cond.conditionLabel
            ? cond.conditionLabel
            : CONDITION_TYPE_LABELS[cond.conditionType];
          const isPending = cond.resolution === "pending";
          const overdue = isPending && new Date(`${cond.conditionDeadline}T23:59:59`) < new Date();

          return (
            <div key={cond.id} className={cn(
              "rounded-xl border px-4 py-3 space-y-2.5",
              !isPending ? "border-zinc-100 bg-zinc-50"
                : overdue ? "border-red-200 bg-red-50/40"
                : "border-amber-200 bg-amber-50/20"
            )}>
              <div className="flex items-start gap-2.5">
                <span className="text-base shrink-0 mt-0.5">
                  {!isPending ? "✅" : overdue ? "🔴" : "🟡"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    !isPending ? "text-zinc-400 line-through"
                      : overdue ? "text-red-800"
                      : "text-zinc-800"
                  )}>{label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    due {fmtConditionDeadline(cond.conditionDeadline)}
                  </p>
                  {!isPending && cond.resolvedAt && (
                    <p className="text-xs text-zinc-400 mt-0.5 capitalize">
                      {cond.resolution} — {formatDate(cond.resolvedAt)}
                    </p>
                  )}
                </div>
                {!isPending && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0 bg-zinc-100 text-zinc-500">
                    {cond.resolution}
                  </span>
                )}
              </div>
              {isPending && (
                <div className="flex gap-2 pl-8">
                  <button type="button" onClick={() => onResolve(cond.id, "waived")}
                    className="text-xs font-medium text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors">
                    Waive Condition
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ---- Stage CTA ----

function StageCTA({ lead, onAction, isConditional, onOpenConditions, onLogOfferReceived, onLogApplicationReceived }: {
  lead: Lead;
  onAction: (m: ModalKey) => void;
  isConditional?: boolean;
  onOpenConditions?: () => void;
  onLogOfferReceived?: () => void;
  onLogApplicationReceived?: () => void;
}) {
  const primaryBtn = "w-full py-3 rounded-xl text-sm font-semibold transition-colors";
  const secondaryBtn = "w-full py-2.5 rounded-xl text-sm font-medium border transition-colors";
  const tertiaryBtn = "w-full py-2.5 rounded-xl text-sm transition-colors text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 border border-zinc-200";
  const exitBtn = "flex-1 py-2 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors";

  // Exit options shown at all active stages
  const exitOptions = (showPause = false, showMoveBack = true, showSuspend = false) => (
    <div className="pt-1 space-y-1.5">
      {showMoveBack && (
        <button type="button" onClick={() => onAction("moveBack")}
          className="w-full py-2 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors">
          ← Move Back One Stage
        </button>
      )}
      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-2 text-center">Other options</p>
      <div className="flex gap-2">
        {showPause && lead.followUpStatus !== "Paused" && (
          <button type="button" onClick={() => onAction("pauseSearch")} className={exitBtn}>
            ⏸ Pause
          </button>
        )}
        {showPause && lead.followUpStatus === "Paused" && (
          <button type="button" onClick={() => onAction("resumeSearch")} className={cn(exitBtn, "border-emerald-200 text-emerald-700 hover:bg-emerald-50")}>
            ▶ Resume
          </button>
        )}
        {showSuspend && lead.followUpStatus !== "Paused" && (
          <button type="button" onClick={() => onAction("suspendListing")} className={exitBtn}>
            ⏸ Suspend Listing
          </button>
        )}
        {showSuspend && lead.followUpStatus === "Paused" && (
          <button type="button" onClick={() => onAction("resumeListing")} className={cn(exitBtn, "border-emerald-200 text-emerald-700 hover:bg-emerald-50")}>
            ▶ Resume Listing
          </button>
        )}
        <button type="button" onClick={() => onAction("closedElsewhere")} className={exitBtn}>
          ⏳ Not Now
        </button>
        <button type="button" onClick={() => onAction("leadLost")}
          className="flex-1 py-2 rounded-lg text-xs font-medium border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
          ✕ Inactive
        </button>
      </div>
    </div>
  );

  switch (lead.stage) {
    case "New":
      return (
        <div className="space-y-2">
          <button type="button" onClick={() => onAction("contact")}
            className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
            Log First Contact
          </button>
          <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
            + Set Follow-Up
          </button>
          {exitOptions(false, false)}
        </div>
      );

    case "Contacted":
      return (
        <div className="space-y-2">
          <button type="button" onClick={() => onAction("discovery")}
            className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
            Complete Discovery
          </button>
          <button type="button" onClick={() => onAction("contact")}
            className={cn(secondaryBtn, "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")}>
            Log Contact Attempt
          </button>
          <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
            + Set Follow-Up
          </button>
          {exitOptions()}
        </div>
      );

    case "Appointment Scheduled":
      // Recruit: begin in-person conversation → In Conversation stage
      if (lead.leadType === "Recruit") {
        return (
          <div className="space-y-2">
            <button type="button" onClick={() => onAction("recruitMeeting")}
              className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
              Begin In-Person Meeting
            </button>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions()}
          </div>
        );
      }
      // Seller & Landlord: sign listing agreement → Pre-Listing
      if (lead.leadType === "Seller" || lead.leadType === "Landlord") {
        return (
          <div className="space-y-2">
            <button type="button" onClick={() => onAction("signListing")}
              className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
              Sign Listing Agreement
            </button>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions()}
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <button type="button" onClick={() => onAction("activeSearch")}
            className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
            Start Active Search
          </button>
          <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
            + Set Follow-Up
          </button>
          {exitOptions()}
        </div>
      );

    case "Pre-Listing":
      return (
        <div className="space-y-2">
          <button type="button" onClick={() => onAction("listOnMls")}
            className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
            {lead.leadType === "Landlord" ? "List for Rent" : "List on MLS"}
          </button>
          <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
            + Set Follow-Up
          </button>
          {exitOptions()}
        </div>
      );

    case "Showing / Active Search":
      // Recruit: extend offer → advances to Offer Extended (Under Contract)
      if (lead.leadType === "Recruit") {
        return (
          <div className="space-y-2">
            <button type="button" onClick={() => onAction("recruitExtendOffer")}
              className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
              Extend Offer to Recruit
            </button>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions()}
          </div>
        );
      }
      // Tenant: submit application → advances to Application Submitted
      if (lead.leadType === "Tenant") {
        return (
          <div className="space-y-2">
            <button type="button" onClick={onLogApplicationReceived}
              className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
              Submit Application
            </button>
            <button type="button" onClick={() => onAction("scheduleShowing")}
              className={cn(secondaryBtn, "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")}>
              Schedule Showing
            </button>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions(true)}
          </div>
        );
      }
      // Landlord (Listed / Active): log incoming application
      if (lead.leadType === "Landlord") {
        return (
          <div className="space-y-2">
            <button type="button" onClick={onLogApplicationReceived}
              className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
              Application Received
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onAction("logSellerShowing")}
                className={cn(secondaryBtn, "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")}>
                Log Showing
              </button>
              <button type="button" onClick={() => onAction("logOpenHouse")}
                className={cn(secondaryBtn, "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")}>
                Log Open House
              </button>
            </div>
            <button type="button" onClick={() => onAction("listingExpiredWithdrawn")}
              className={cn(secondaryBtn, "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")}>
              Listing Expired / Withdrawn
            </button>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions(false, true, true)}
          </div>
        );
      }
      // Seller (Listed / Active): receive offer instead of submitting
      if (lead.leadType === "Seller") {
        return (
          <div className="space-y-2">
            <button type="button" onClick={onLogOfferReceived}
              className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
              Log Offer Received
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onAction("logSellerShowing")}
                className={cn(secondaryBtn, "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")}>
                Log Showing
              </button>
              <button type="button" onClick={() => onAction("logOpenHouse")}
                className={cn(secondaryBtn, "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")}>
                Log Open House
              </button>
            </div>
            <button type="button" onClick={() => onAction("listingExpiredWithdrawn")}
              className={cn(secondaryBtn, "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")}>
              Listing Expired / Withdrawn
            </button>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions(false, true, true)}
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <button type="button" onClick={() => onAction("offerSubmitted")}
            className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
            Offer Submitted
          </button>
          <button type="button" onClick={() => onAction("scheduleShowing")}
            className={cn(secondaryBtn, "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")}>
            Schedule Showing
          </button>
          <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
            + Set Follow-Up
          </button>
          {exitOptions(true)}
        </div>
      );

    case "Offer":
      if (lead.leadType === "Tenant") {
        return (
          <div className="space-y-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center">
              <p className="text-sm font-medium text-zinc-700">Update application status below</p>
              <p className="text-xs text-zinc-400 mt-0.5">Mark approved or rejected based on the landlord&apos;s decision.</p>
            </div>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions(true)}
          </div>
        );
      }
      if (lead.leadType === "Landlord") {
        return (
          <div className="space-y-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center">
              <p className="text-sm font-medium text-zinc-700">Review applications in the panel below</p>
              <p className="text-xs text-zinc-400 mt-0.5">Approve an application to advance to Lease Signed.</p>
            </div>
            <button type="button"
              onClick={() => onAction("landlordLost")}
              className={cn(secondaryBtn, "bg-white text-red-600 border-red-200 hover:bg-red-50")}>
              Mark as Inactive
            </button>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions()}
          </div>
        );
      }
      if (lead.leadType === "Seller") {
        return (
          <div className="space-y-2">
            {isConditional ? (
              <button type="button" onClick={onOpenConditions}
                className={cn(primaryBtn, "bg-zinc-100 text-zinc-400 flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-200 transition-colors")}>
                <span>🔒</span>
                <span>Under Contract — Conditions Pending</span>
              </button>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center">
                <p className="text-sm font-medium text-zinc-700">Review offers in the panel below</p>
                <p className="text-xs text-zinc-400 mt-0.5">Accept an offer from the Offers Received panel to advance.</p>
              </div>
            )}
            <button type="button"
              onClick={() => onAction("sellerOfferLost")}
              className={cn(secondaryBtn, "bg-white text-red-600 border-red-200 hover:bg-red-50")}>
              Offer Lost
            </button>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions()}
          </div>
        );
      }
      return (
        <div className="space-y-2">
          {isConditional ? (
            <button type="button" onClick={onOpenConditions}
              className={cn(primaryBtn, "bg-zinc-100 text-zinc-400 flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-200 transition-colors")}>
              <span>🔒</span>
              <span>Under Contract — Conditions Pending</span>
            </button>
          ) : (
            <button type="button" onClick={() => onAction("dealAccepted")}
              className={cn(primaryBtn, "bg-emerald-600 text-white hover:bg-emerald-700")}>
              Deal Accepted
            </button>
          )}
          <button type="button" onClick={() => onAction("offerLost")}
            className={cn(secondaryBtn, "bg-white text-red-600 border-red-200 hover:bg-red-50")}>
            Offer Lost
          </button>
          <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
            + Set Follow-Up
          </button>
          {exitOptions(true)}
        </div>
      );

    case "Under Contract":
      // Recruit: offer management handled in RecruitOfferPanel below
      if (lead.leadType === "Recruit") {
        return (
          <div className="space-y-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center">
              <p className="text-sm font-medium text-zinc-700">Manage the offer in the panel below</p>
              <p className="text-xs text-zinc-400 mt-0.5">Log offer details, then mark the recruit as Joined or Declined.</p>
            </div>
            <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
              + Set Follow-Up
            </button>
            {exitOptions()}
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <button type="button" onClick={() => onAction("markClosed")}
            className={cn(primaryBtn, "bg-emerald-600 text-white hover:bg-emerald-700")}>
            Mark Closed
          </button>
          <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
            + Set Follow-Up
          </button>
          {exitOptions()}
        </div>
      );

    case "Closed":
      if (lead.leadType === "Recruit") {
        return (
          <div className="space-y-2">
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 space-y-1">
              <p className="text-sm font-medium text-green-800">🎉 Recruit has joined the brokerage!</p>
              <p className="text-xs text-green-700">Complete the onboarding checklist below and initiate the licence transfer with the regulator.</p>
            </div>
            <button type="button" onClick={() => onAction("followup")}
              className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
              Create Follow-Up Reminder
            </button>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 space-y-1">
            <p className="text-sm font-medium text-green-800">Transaction completed</p>
            <p className="text-xs text-green-700">Consider requesting a testimonial & request referrals.</p>
          </div>
          <button type="button" onClick={() => onAction("followup")}
            className={cn(primaryBtn, "bg-zinc-900 text-white hover:bg-zinc-800")}>
            Create Follow-Up Reminder
          </button>
        </div>
      );

    default:
      return (
        <div>
          <button type="button" onClick={() => onAction("followup")} className={tertiaryBtn}>
            + Set Follow-Up
          </button>
        </div>
      );
  }
}

// ---- Main client component ----

interface Props {
  lead: Lead;
  activities: Activity[];
  reminders: Reminder[];
  showings: Showing[];
}

export function LeadDetailClient({ lead, activities, reminders, showings }: Props) {
  const { role } = useRole();
  const currentAgent = role === "agent" ? AGENT_NAME : MANAGER_NAME;
  const renderNow = useNow();
  const { updateLead, addActivity, addReminder, completeReminder, addShowing, updateShowing, deleteShowing, offerRounds, acceptedOffers, updateAcceptedOffer, offerConditions, updateOfferCondition, updateOfferRound, cancelRemindersBySourceId, cancelRemindersBySourceIdPrefix, checklistItems, addChecklistItems, updateChecklistItem, listingDetails: allListingDetails, addListingDetails, updateListingDetails, leaseDetails: allLeaseDetails, updateLeaseDetails, tenantLeaseDetails: allTenantLeaseDetails, updateTenantLeaseDetails, sellerShowings, openHouses, addSellerShowing, addOpenHouse, buyerAgreements, addBuyerAgreement, buyerOfferThreads, addBuyerOfferThread, updateBuyerOfferThread } = useStore();

  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const closeModal = () => {
    setActiveModal(null);
    // Clear the return flag so the modal doesn't re-open on next render
    if (lead.offerLostReturn) {
      updateLead(lead.id, { offerLostReturn: undefined, updatedAt: new Date().toISOString() });
    }
  };

  // Auto-open "What's next?" prompt when returning to Active Search after a lost offer.
  // Only show if ALL threads for this lead are inactive (no active threads remaining).
  // Adjusts state during render when the condition turns true (React's recommended
  // alternative to setState inside an effect); closeModal clears offerLostReturn.
  const shouldPromptOfferLost =
    !!lead.offerLostReturn &&
    lead.stage === "Showing / Active Search" &&
    !buyerOfferThreads.some((t) => t.leadId === lead.id && t.status === "active");
  const [promptedOfferLost, setPromptedOfferLost] = useState(false);
  if (shouldPromptOfferLost !== promptedOfferLost) {
    setPromptedOfferLost(shouldPromptOfferLost);
    if (shouldPromptOfferLost) setActiveModal("offerLostNext");
  }
  const [editingShowing, setEditingShowing] = useState<Showing | null>(null);
  const [completingShowingReminder, setCompletingShowingReminder] = useState<Reminder | null>(null);
  const [completingTaskReminder, setCompletingTaskReminder] = useState<Reminder | null>(null);
  const [offerFirmBanner, setOfferFirmBanner] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [conditionsToast, setConditionsToast] = useState(false);
  const [showPreListingChecklistModal, setShowPreListingChecklistModal] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const TIMELINE_COLLAPSED_COUNT = 5;

  // Lead-type flags
  const isBuyerLead = lead.leadType === "Buyer";
  const isSellerLead = lead.leadType === "Seller";
  const isLandlordLead = lead.leadType === "Landlord";
  const isTenantLead = lead.leadType === "Tenant";
  const isRecruitLead = lead.leadType === "Recruit";
  // BRA signed check — true if any BuyerAgreement for this lead has braSigned = true
  const hasBraSigned = buyerAgreements.some((b) => b.leadId === lead.id && b.braSigned === true);

  // Modal action handler — intercepts "offerSubmitted" to enforce BRA check for Buyer leads
  const handleModalAction = (key: ModalKey) => {
    if (key === "offerSubmitted" && isBuyerLead && !hasBraSigned) {
      setActiveModal("braRequired");
      return;
    }
    if (key === "resumeSearch") { handleResumeSearch(); return; }
    if (key === "resumeListing") { handleResumeListing(); return; }
    setActiveModal(key);
  };

  const leadListingDetails = allListingDetails.find((ld) => ld.leadId === lead.id);
  const isListingExpired = !!(
    (isSellerLead || isLandlordLead) &&
    leadListingDetails?.listingAgreementExpiryDate &&
    new Date(`${leadListingDetails.listingAgreementExpiryDate}T23:59:59`) < new Date() &&
    leadListingDetails?.listingStatus !== "terminated" &&
    lead.stage !== "Closed" &&
    lead.stage !== "Lost"
  );
  const leadPreListingItems = checklistItems.filter(
    (c) => c.leadId === lead.id && c.checklistType === "pre_listing"
  );

  // Condition-derived state
  const leadAcceptedOffer = acceptedOffers.find((ao) => ao.leadId === lead.id);
  const leadConditions = leadAcceptedOffer
    ? offerConditions.filter((c) => c.acceptedOfferId === leadAcceptedOffer.id)
    : [];
  const dealStatus = computeDealStatus(leadConditions);
  const isConditional = lead.stage === "Offer" && dealStatus === "conditional";
  const pendingConditionsCount = leadConditions.filter((c) => c.resolution === "pending").length;

  // Under-contract items: no checklistType OR explicitly "under_contract" (backward compat)
  const leadChecklistItems = checklistItems.filter(
    (c) => c.leadId === lead.id && (!c.checklistType || c.checklistType === "under_contract")
  );

  const hoursOld = (renderNow - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
  const showResponseWarning = lead.stage === "New" && !lead.lastContactedAt && hoursOld > 1;

  const stageIdx = PIPELINE_STAGES.indexOf(lead.stage);
  const conversionIdx = PIPELINE_STAGES.indexOf(getConversionStage(lead.leadType));
  const isConverted = stageIdx >= conversionIdx && lead.stage !== "Lost" && lead.stage !== "Closed";

  const phoneDigits = lead.phone.replace(/\D/g, "");
  const openReminders = reminders
    .filter((r) => !r.completed)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const SELLER_STAGE_BANNERS: Partial<Record<PipelineStage, typeof STAGE_BANNERS[keyof typeof STAGE_BANNERS]>> = {
    "Contacted":               { icon: "💬", text: "Initial conversation completed",        sub: "Log discovery details — seller's motivation, property, price expectations and timeline.", bg: "bg-blue-50",    border: "border-blue-200",    textColor: "text-blue-800"    },
    "Appointment Scheduled":   { icon: "✓",  text: "Discovery complete",                    sub: "Prepare and sign the listing agreement when seller is ready.",                          bg: "bg-violet-50",  border: "border-violet-200",  textColor: "text-violet-800"  },
    "Pre-Listing":             { icon: "📋", text: "Listing agreement signed",               sub: "Complete prep checklist, then list on MLS when everything is ready.",                    bg: "bg-sky-50",     border: "border-sky-200",     textColor: "text-sky-800"     },
    "Showing / Active Search": { icon: "🏷️", text: "Property live on MLS",                  sub: "Monitor for incoming offers and keep the seller updated on activity.",                   bg: "bg-amber-50",   border: "border-amber-200",   textColor: "text-amber-800"   },
    "Offer":                   { icon: "📄", text: "Offer received — review with seller",   sub: "Review offer terms with your seller and respond to the buyer.",                          bg: "bg-orange-50",  border: "border-orange-200",  textColor: "text-orange-800"  },
    "Under Contract":          { icon: "🤝", text: "Deal progressing toward closing",       sub: "Coordinate with seller, buyer's agent and lawyers for a smooth close.",                  bg: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-800" },
    "Closed":                  { icon: "🎉", text: "Transaction completed",                 sub: "Consider requesting a testimonial & request referrals.",                                 bg: "bg-green-50",   border: "border-green-200",   textColor: "text-green-800"   },
  };

  const LANDLORD_STAGE_BANNERS: Partial<Record<PipelineStage, typeof STAGE_BANNERS[keyof typeof STAGE_BANNERS]>> = {
    "Contacted":               { icon: "💬", text: "Initial conversation completed",        sub: "Log discovery details — landlord's motivation, property details and rental expectations.", bg: "bg-blue-50",    border: "border-blue-200",    textColor: "text-blue-800"    },
    "Appointment Scheduled":   { icon: "✓",  text: "Discovery complete",                    sub: "Prepare and sign the listing agreement when landlord is ready to proceed.",              bg: "bg-violet-50",  border: "border-violet-200",  textColor: "text-violet-800"  },
    "Pre-Listing":             { icon: "📋", text: "Listing agreement signed",               sub: "Complete prep checklist, then list for rent when everything is ready.",                  bg: "bg-sky-50",     border: "border-sky-200",     textColor: "text-sky-800"     },
    "Showing / Active Search": { icon: "🏷️", text: "Property listed for rent",              sub: "Monitor incoming applications and keep the landlord updated.",                           bg: "bg-amber-50",   border: "border-amber-200",   textColor: "text-amber-800"   },
    "Offer":                   { icon: "📋", text: "Applications received — review with landlord", sub: "Review tenant applications and approve the best fit.",                             bg: "bg-orange-50",  border: "border-orange-200",  textColor: "text-orange-800"  },
    "Under Contract":          { icon: "🤝", text: "Lease signed — tenancy in progress",   sub: "Confirm lease details and collect deposit to complete the tenancy.",                    bg: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-800" },
    "Closed":                  { icon: "🎉", text: "Tenancy established",                   sub: "Consider requesting a testimonial & request referrals.",                                 bg: "bg-green-50",   border: "border-green-200",   textColor: "text-green-800"   },
  };

  const TENANT_STAGE_BANNERS: Partial<Record<PipelineStage, typeof STAGE_BANNERS[keyof typeof STAGE_BANNERS]>> = {
    "Contacted":               { icon: "💬", text: "Initial conversation completed",          sub: "Log discovery details — budget, move-in timeline, property preferences.", bg: "bg-blue-50",    border: "border-blue-200",    textColor: "text-blue-800"    },
    "Appointment Scheduled":   { icon: "✓",  text: "Discovery complete",                      sub: "Start active search when the tenant is ready to begin viewing rentals.",  bg: "bg-violet-50",  border: "border-violet-200",  textColor: "text-violet-800"  },
    "Showing / Active Search": { icon: "🏠", text: "Actively searching for a rental",         sub: "Submit an application when a suitable property is found.",               bg: "bg-amber-50",   border: "border-amber-200",   textColor: "text-amber-800"   },
    "Offer":                   { icon: "📋", text: "Application submitted — awaiting outcome", sub: "Mark approved or rejected based on landlord's decision.",                bg: "bg-orange-50",  border: "border-orange-200",  textColor: "text-orange-800"  },
    "Under Contract":          { icon: "🤝", text: "Lease signed — confirm details",          sub: "Fill in lease dates and confirm deposit to complete the tenancy.",       bg: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-800" },
    "Closed":                  { icon: "🎉", text: "Tenancy established",                     sub: "Consider requesting a testimonial & request referrals.",                 bg: "bg-green-50",   border: "border-green-200",   textColor: "text-green-800"   },
  };

  const RECRUIT_STAGE_BANNERS: Partial<Record<PipelineStage, typeof STAGE_BANNERS[keyof typeof STAGE_BANNERS]>> = {
    "Contacted":               { icon: "💬", text: "Initial conversation completed",         sub: "Complete discovery — learn about their current brokerage, experience and expectations.", bg: "bg-blue-50",    border: "border-blue-200",    textColor: "text-blue-800"    },
    "Appointment Scheduled":   { icon: "✓",  text: "Discovery complete",                     sub: "Schedule and conduct an in-person meeting to begin the recruiting conversation.",        bg: "bg-violet-50",  border: "border-violet-200",  textColor: "text-violet-800"  },
    "Showing / Active Search": { icon: "🤝", text: "In conversation — recruiting in progress", sub: "Extend a formal offer when the recruit is ready to proceed.",                         bg: "bg-amber-50",   border: "border-amber-200",   textColor: "text-amber-800"   },
    "Under Contract":          { icon: "📄", text: "Offer extended — awaiting decision",     sub: "Follow up with the recruit and respond to any questions or counter-proposals.",         bg: "bg-orange-50",  border: "border-orange-200",  textColor: "text-orange-800"  },
    "Closed":                  { icon: "🎉", text: "Recruit has joined the brokerage!",             sub: "Complete onboarding checklist and initiate the licence transfer with the regulator.",                             bg: "bg-green-50",   border: "border-green-200",   textColor: "text-green-800"   },
  };

  const stageBanner =
    (isRecruitLead && RECRUIT_STAGE_BANNERS[lead.stage]) ||
    (isTenantLead && TENANT_STAGE_BANNERS[lead.stage]) ||
    (isLandlordLead && LANDLORD_STAGE_BANNERS[lead.stage]) ||
    (isSellerLead && SELLER_STAGE_BANNERS[lead.stage]) ||
    STAGE_BANNERS[lead.stage];

  // ---- Handlers ----

  /** If `text` is non-empty, saves it as a type:"note" activity so it appears in the Notes card.
   *  `source` is the form/stage label shown in the Notes card (e.g. "Complete Discovery"). */
  const addNoteIfPresent = (text: string | undefined, now: string, source?: string) => {
    if (!text?.trim()) return;
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "note",
      title: source ? `Note — ${source}` : "Note added",
      description: text.trim(),
      createdAt: now, createdBy: currentAgent,
    });
  };

  const handleContactAttempt = (data: ContactAttemptData) => {
    const now = new Date().toISOString();
    const stageChanged = data.moveToContacted;
    const followUpCreated = data.addFollowUp && !!data.followUpTitle && !!data.followUpDueDate;

    const contactAttempt = buildContactAttemptEvent({
      method: data.outreachType,
      result: data.result,
      agent: currentAgent,
      timestamp: now,
      stageChanged,
      previousStage: stageChanged ? lead.stage : undefined,
      followUpCreated,
      followUpTitle: followUpCreated ? data.followUpTitle : undefined,
      note: data.note || undefined,
    });

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "contact_attempt",
      title: `Contact Attempt — ${data.outreachType}: ${data.result}`,
      description: data.note || `${data.outreachType} attempt logged.`,
      createdAt: now,
      createdBy: currentAgent,
      result: data.result,
      contactAttempt,
    });

    if (stageChanged) {
      addActivity({
        id: `act-${genId()}`,
        leadId: lead.id,
        type: "stage_change",
        title: `Stage updated: ${getStageDisplayName(lead.stage, lead.leadType)} → Contacted`,
        description: "Stage updated automatically after successful contact.",
        createdAt: now,
        createdBy: currentAgent,
      });
      updateLead(lead.id, { stage: "Contacted", lastContactedAt: now, updatedAt: now });
      // Auto-close any "initial outreach" reminder — first contact is done
      reminders
        .filter((r) => !r.completed && /initial outreach/i.test(r.title))
        .forEach((r) => completeReminder(r.id));
    } else {
      updateLead(lead.id, { lastContactedAt: now, updatedAt: now });
    }

    if (followUpCreated) {
      addReminder({
        id: `r-${genId()}`,
        leadId: lead.id,
        leadName: fullName(lead),
        title: data.followUpTitle!,
        dueDate: new Date(data.followUpDueDate!).toISOString(),
        createdAt: now,
        followUpStatus: lead.followUpStatus,
        assignedTo: lead.assignedAgent,
        completed: false,
        priority: data.followUpPriority ?? "medium",
      });
    }
    addNoteIfPresent(data.note, now, "Log Contact Attempt");
    closeModal();
  };

  const handleDiscovery = (data: DiscoveryData) => {
    const now = new Date().toISOString();
    const isSellerOrLandlord = isSellerLead || isLandlordLead;
    const topics = isRecruitLead
      ? [
          data.brokerageDiscussed      && "current brokerage",
          data.experienceDiscussed     && "experience",
          data.annualVolumeDiscussed   && "annual volume",
          data.areasDiscussedRecruit   && "areas of focus",
          data.commissionDiscussed     && "commission expectations",
        ].filter(Boolean).join(", ")
      : isSellerOrLandlord
      ? [
          data.sellerMotivationDiscussed  && "motivation",
          data.propertyDetailsReviewed    && "property details",
          data.sellerTimelineDiscussed    && "timeline",
          data.priceExpectationsDiscussed && (isLandlordLead ? "rental price expectations" : "price expectations"),
        ].filter(Boolean).join(", ")
      : [
          data.budgetDiscussed       && "budget",
          data.timelineDiscussed     && "timeline",
          data.motivationDiscussed   && "motivation",
          data.propertyTypeConfirmed && "property type",
        ].filter(Boolean).join(", ");

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "meeting",
      title: "Discovery completed",
      description: [`Discussed: ${topics}`, data.notes].filter(Boolean).join(". "),
      createdAt: now,
      createdBy: currentAgent,
    });
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: "Stage updated: Contacted → Appointment Scheduled",
      description: isRecruitLead
        ? "Recruit qualified — in-person meeting scheduled."
        : isLandlordLead
        ? "Landlord qualified — appointment scheduled."
        : isSellerLead
        ? "Seller qualified — appointment scheduled."
        : "Lead qualified after discovery conversation.",
      createdAt: now,
      createdBy: currentAgent,
    });
    // Build preference patch from whatever the agent captured
    const prefPatch: Partial<Lead> = {};
    if (data.budget)             prefPatch.budget = data.budget;
    if (data.clientTimeline)     prefPatch.clientTimeline = data.clientTimeline as import("@/lib/types").ClientTimeline;
    if (data.motivationNotes)    prefPatch.motivationNotes = data.motivationNotes;
    if (data.sellerMotivationNotes) prefPatch.motivationNotes = data.sellerMotivationNotes;
    if (data.propertyType)       prefPatch.propertyType = data.propertyType;
    if (data.preferredAreas)     prefPatch.preferredAreas = data.preferredAreas.split(",").map((s) => s.trim()).filter(Boolean);
    if (data.sellerPropertyType)  prefPatch.propertyType = data.sellerPropertyType;
    if (data.propertyDetailsNotes) prefPatch.notes = [lead.notes, data.propertyDetailsNotes].filter(Boolean).join(" | ");
    if (data.priceExpectations) {
      // Auto-format: strip non-numeric, then format as $X,XXX or $X,XXX/mo
      const raw = parseFloat(data.priceExpectations.replace(/[^0-9.]/g, ""));
      if (!isNaN(raw) && raw > 0) {
        prefPatch.budget = isLandlordLead
          ? `$${raw.toLocaleString("en-CA")}/mo`
          : `$${raw.toLocaleString("en-CA")}`;
      } else {
        prefPatch.budget = data.priceExpectations; // keep as-is if not a plain number
      }
    }
    if (data.closingDateExpectation && isSellerLead) {
      prefPatch.closingDateExpectation = data.closingDateExpectation;
      const displayVal = ["30","60","90"].includes(data.closingDateExpectation)
        ? `${data.closingDateExpectation} days`
        : data.closingDateExpectation;
      addActivity({
        id: `act-${genId()}`,
        leadId: lead.id,
        type: "note",
        title: `Discovery updated — Closing timeline: ${displayVal}`,
        description: `Seller's preferred closing timeline recorded as: ${displayVal}`,
        createdAt: now,
        createdBy: currentAgent,
      });
      addNoteIfPresent(`Closing timeline: ${displayVal}`, now, "Complete Discovery");
    }
    // Recruit-specific patch
    if (data.currentBrokerage)        prefPatch.currentBrokerage = data.currentBrokerage;
    if (data.yearsExperience)         prefPatch.yearsExperience = data.yearsExperience as Lead["yearsExperience"];
    if (data.annualTransactionVolume) prefPatch.annualTransactionVolume = data.annualTransactionVolume as Lead["annualTransactionVolume"];
    if (data.areasOfFocus)            prefPatch.areasOfFocus = data.areasOfFocus;
    if (data.expectedCommissionSplit) prefPatch.expectedCommissionSplit = data.expectedCommissionSplit;

    updateLead(lead.id, { stage: "Appointment Scheduled", qualificationStatus: "Qualified", updatedAt: now, ...prefPatch });
    addNoteIfPresent(data.notes, now, "Complete Discovery");
    closeModal();
  };

  const handleActiveSearch = (data: ActiveSearchData) => {
    const now = new Date().toISOString();
    const desc = [
      data.areasDiscussed && `Areas: ${data.areasDiscussed}`,
      data.budgetConfirmed && `Budget: ${data.budgetConfirmed}`,
      `Financing: ${data.financingStatus}`,
      data.notes,
    ].filter(Boolean).join(". ");

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: `${getStageDisplayName("Showing / Active Search", lead.leadType)} started`,
      description: desc,
      createdAt: now,
      createdBy: currentAgent,
    });
    updateLead(lead.id, {
      stage: "Showing / Active Search",
      ...(data.budgetConfirmed && { budget: data.budgetConfirmed }),
      ...(isTenantLead && { applicationReadiness: data.financingStatus as ApplicationReadiness }),
      ...(!isTenantLead && data.financingStatus && { financingStatus: data.financingStatus as FinancingStatus }),
      updatedAt: now,
    });
    addNoteIfPresent(data.notes, now, "Start Active Search");

    // BRA processing — Buyer only
    if (isBuyerLead && data.braSigned !== null) {
      addBuyerAgreement({
        id: `bra-${genId()}`,
        leadId: lead.id,
        braSigned: data.braSigned,
        braDate: data.braDate,
        braNotes: data.braNotes,
        createdAt: now,
        updatedAt: now,
      });
      if (data.braSigned) {
        cancelRemindersBySourceId(`bra-${lead.id}`);
        addActivity({
          id: `act-${genId()}`, leadId: lead.id, type: "note",
          title: `BRA signed — ${data.braDate ?? now.slice(0, 10)}`,
          description: data.braNotes || "Buyer Representation Agreement signed.",
          createdAt: now, createdBy: currentAgent,
        });
        addChecklistItems([{
          id: `cl-bra-${genId()}`, leadId: lead.id, name: "Upload signed BRA to the back-office system",
          status: "open", autoCreated: true, checklistType: "follow_up", createdAt: now, updatedAt: now,
        }]);
      } else {
        const dueDate = new Date(Date.now() + 3 * 86_400_000).toISOString();
        addReminder({
          id: `r-bra-${genId()}`, leadId: lead.id, leadName: fullName(lead),
          title: `⚠️ Buyer Representation Agreement not yet signed — ${lead.firstName}`,
          dueDate, createdAt: now,
          followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "medium",
          sourceId: `bra-${lead.id}`,
        });
      }
    }
    closeModal();
  };

  const handleRecruitConversation = (notes: string) => {
    const now = new Date().toISOString();
    const trimmed = notes.trim();
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "meeting",
      title: "In-person meeting started",
      description: trimmed || "Recruiting conversation begun.",
      createdAt: now, createdBy: currentAgent,
    });
    if (trimmed) {
      addActivity({
        id: `act-${genId()}`, leadId: lead.id, type: "note",
        title: "Note — Begin In-Person Meeting",
        description: trimmed,
        createdAt: now, createdBy: currentAgent,
      });
    }
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
      title: `Stage updated: Appointment Scheduled → ${getStageDisplayName("Showing / Active Search", lead.leadType)}`,
      description: "Recruit is in active conversation.",
      createdAt: now, createdBy: currentAgent,
    });
    updateLead(lead.id, { stage: "Showing / Active Search", lastContactedAt: now, updatedAt: now });
    closeModal();
  };

  const handleRecruitExtendOffer = (notes: string) => {
    const now = new Date().toISOString();
    const trimmed = notes.trim();
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: "Offer extended to recruit",
      description: trimmed || "Formal offer extended — log commission details in the panel below.",
      createdAt: now, createdBy: currentAgent,
    });
    if (trimmed) {
      addActivity({
        id: `act-${genId()}`, leadId: lead.id, type: "note",
        title: "Note — Extend Offer to Recruit",
        description: trimmed,
        createdAt: now, createdBy: currentAgent,
      });
    }
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
      title: `Stage updated: ${getStageDisplayName("Showing / Active Search", lead.leadType)} → ${getStageDisplayName("Under Contract", lead.leadType)}`,
      description: "Recruit offer has been extended. Awaiting decision.",
      createdAt: now, createdBy: currentAgent,
    });
    updateLead(lead.id, { stage: "Under Contract", lastContactedAt: now, updatedAt: now });
    closeModal();
  };

  const handleLogBra = (data: LogBraData) => {
    const now = new Date().toISOString();
    addBuyerAgreement({
      id: `bra-${genId()}`,
      leadId: lead.id,
      braSigned: true,
      braDate: data.braDate,
      braExpiryDate: data.braExpiryDate || undefined,
      braNotes: data.braNotes || undefined,
      createdAt: now,
      updatedAt: now,
    });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "note",
      title: `BRA signed — ${data.braDate}${data.braExpiryDate ? `, expires ${data.braExpiryDate}` : ""}`,
      description: data.braNotes || "Buyer Representation Agreement signed.",
      createdAt: now, createdBy: currentAgent,
    });
    // Cancel the "BRA not yet signed" reminder
    cancelRemindersBySourceId(`bra-${lead.id}`);
    // After logging BRA, open the offer submitted modal so agent can proceed
    setActiveModal("offerSubmitted");
  };

  const handleOfferSubmitted = (data: OfferSubmittedData) => {
    // Defense-in-depth: block if BRA not signed for Buyer leads
    if (isBuyerLead && !hasBraSigned) {
      setActiveModal("braRequired");
      return;
    }
    const now = new Date().toISOString();
    // Create a BuyerOfferThread for the property — the ThreadCard auto-opens AddRoundModal
    addBuyerOfferThread({
      id: `bot-${genId()}`,
      leadId: lead.id,
      propertyAddress: data.propertyAddress,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "offer",
      title: `Offer submitted — ${data.propertyAddress}`,
      description: [`Offer date: ${data.offerDate}`, data.notes].filter(Boolean).join(". "),
      createdAt: now,
      createdBy: currentAgent,
    });
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: "Stage updated: Showing / Active Search → Offer",
      description: `Offer submitted on ${data.propertyAddress}.`,
      createdAt: now,
      createdBy: currentAgent,
    });
    updateLead(lead.id, {
      stage: "Offer",
      lastContactedAt: now,
      updatedAt: now,
      offerLostReturn: undefined,
      ...clearPauseIfNeeded(),
    });
    if (data.addReminderFlag && data.reminderTitle && data.reminderDate) {
      addReminder({
        id: `r-${genId()}`,
        leadId: lead.id,
        leadName: fullName(lead),
        title: data.reminderTitle,
        dueDate: new Date(data.reminderDate).toISOString(),
        createdAt: now,
        followUpStatus: lead.followUpStatus,
        assignedTo: lead.assignedAgent,
        completed: false,
        priority: data.reminderPriority ?? "high",
      });
    }
    addNoteIfPresent(data.notes, now, "Submit Offer");
    closeModal();
  };

  const handleDealAccepted = (data: DealAcceptedData) => {
    const now = new Date().toISOString();
    const desc = [
      data.acceptedPrice && `Accepted at ${data.acceptedPrice}`,
      data.closingDate && `Closing ${data.closingDate}`,
      data.conditionsDate && `Conditions ${data.conditionsDate}`,
      data.notes,
    ].filter(Boolean).join(". ");

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: `Deal accepted — ${getStageDisplayName("Under Contract", lead.leadType)}`,
      description: desc || "Offer accepted.",
      createdAt: now,
      createdBy: currentAgent,
    });
    updateLead(lead.id, { stage: "Under Contract", lastContactedAt: now, updatedAt: now, ...clearPauseIfNeeded() });
    addNoteIfPresent(data.notes, now, "Deal Accepted");
    closeModal();
    triggerUnderContractChecklist();
  };

  const handleOfferLost = (data: OfferLostData) => {
    const now = new Date().toISOString();
    const reasonLabel = OFFER_LOSS_REASONS.find((o) => o.value === data.reason)?.label ?? data.reason;

    // Cancel ALL offer-related reminders for active threads
    const activeThreads = buyerOfferThreads.filter((t) => t.leadId === lead.id && t.status === "active");
    activeThreads.forEach((t) => {
      cancelRemindersBySourceIdPrefix(`offer-expiry-${t.id}`);
      cancelRemindersBySourceIdPrefix(`deposit-${t.id}`);
      cancelRemindersBySourceIdPrefix(`title-search-${t.id}`);
      cancelRemindersBySourceIdPrefix(`buyer-inspection-${t.id}`);
      updateBuyerOfferThread(t.id, { status: "inactive", lossReason: reasonLabel, updatedAt: now });
    });

    // Mark active/countered rounds as rejected for all active threads
    const activeThreadIds = new Set(activeThreads.map((t) => t.id));
    const currentRounds = offerRounds.filter(
      (r) => r.leadId === lead.id && (r.threadId ? activeThreadIds.has(r.threadId) : !r.threadId)
    );
    currentRounds.forEach((r) => {
      const patch: Partial<typeof r> = { lossReason: reasonLabel, updatedAt: now };
      if (r.status === "active" || r.status === "countered") patch.status = "rejected";
      updateOfferRound(r.id, patch);
    });

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: `Offer lost — ${reasonLabel}`,
      description: data.notes || `Offer lost: ${reasonLabel}. Lead returned to active search.`,
      createdAt: now,
      createdBy: currentAgent,
    });
    updateLead(lead.id, {
      stage: "Showing / Active Search",
      offerLostReturn: true,
      updatedAt: now,
    });
    addNoteIfPresent(data.notes, now, "Offer Lost");
    closeModal();
  };

  // Helper: cancels pause/suspension reminders and returns patch to clear pause state
  const clearPauseIfNeeded = (): Partial<typeof lead> => {
    if (lead.followUpStatus !== "Paused") return {};
    cancelRemindersBySourceId(`search-pause-${lead.id}`);
    cancelRemindersBySourceId(`listing-suspension-${lead.id}`);
    return {
      followUpStatus: "Active Follow-Up" as const,
      pauseReason: undefined,
      pauseReturnDate: undefined,
      listingSuspensionEndDate: undefined,
      listingSuspensionReason: undefined,
    };
  };

  const handlePauseSearch = (data: PauseSearchData) => {
    const now = new Date().toISOString();
    const actDesc = [data.reason, data.returnDate && `Returns: ${data.returnDate}`, data.notes].filter(Boolean).join(". ");
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "note",
      title: `Search paused — ${data.reason}`,
      description: actDesc,
      createdAt: now, createdBy: currentAgent,
    });
    addNoteIfPresent(`Search paused — ${data.reason}${data.returnDate ? `. Returns: ${data.returnDate}` : ""}${data.notes ? `. ${data.notes}` : ""}`, now, "Pause Search");
    if (data.returnDate) {
      addReminder({
        id: `r-${genId()}`,
        sourceId: `search-pause-${lead.id}`,
        leadId: lead.id, leadName: fullName(lead),
        title: `Search pause ends — follow up with ${lead.firstName}`,
        dueDate: new Date(`${data.returnDate}T09:00:00`).toISOString(),
        createdAt: now, followUpStatus: "Paused", assignedTo: lead.assignedAgent,
        completed: false, priority: "medium",
      });
    }
    updateLead(lead.id, {
      followUpStatus: "Paused",
      pauseReason: data.reason,
      pauseReturnDate: data.returnDate || undefined,
      updatedAt: now,
    });
    closeModal();
  };

  const handleSuspendListing = (data: SuspendListingData) => {
    const now = new Date().toISOString();
    const endFmt = new Date(`${data.endDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "note",
      title: `Listing suspended until ${endFmt} — ${data.reason}`,
      description: data.notes || `Suspended until ${endFmt}. Reason: ${data.reason}`,
      createdAt: now, createdBy: currentAgent,
    });
    addNoteIfPresent(`Listing suspended until ${endFmt}. Reason: ${data.reason}${data.notes ? `. ${data.notes}` : ""}`, now, "Suspend Listing");
    addReminder({
      id: `r-${genId()}`,
      sourceId: `listing-suspension-${lead.id}`,
      leadId: lead.id, leadName: fullName(lead),
      title: `Listing suspension ends — follow up to relist · ${lead.firstName} ${lead.lastName}`,
      dueDate: new Date(`${data.endDate}T09:00:00`).toISOString(),
      createdAt: now, followUpStatus: "Paused", assignedTo: lead.assignedAgent,
      completed: false, priority: "medium",
    });
    updateLead(lead.id, {
      followUpStatus: "Paused",
      listingSuspensionEndDate: data.endDate,
      listingSuspensionReason: data.reason,
      updatedAt: now,
    });
    if (leadListingDetails) {
      updateListingDetails(leadListingDetails.id, { listingStatus: "suspended", updatedAt: now });
    }
    closeModal();
  };

  const handleResumeSearch = () => {
    const now = new Date().toISOString();
    cancelRemindersBySourceId(`search-pause-${lead.id}`);
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "note",
      title: "Search resumed",
      description: "Agent resumed the search.",
      createdAt: now, createdBy: currentAgent,
    });
    updateLead(lead.id, {
      followUpStatus: "Active Follow-Up",
      pauseReason: undefined,
      pauseReturnDate: undefined,
      updatedAt: now,
    });
  };

  const handleResumeListing = () => {
    const now = new Date().toISOString();
    cancelRemindersBySourceId(`listing-suspension-${lead.id}`);
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "note",
      title: "Listing resumed",
      description: "Agent resumed the listing.",
      createdAt: now, createdBy: currentAgent,
    });
    updateLead(lead.id, {
      followUpStatus: "Active Follow-Up",
      listingSuspensionEndDate: undefined,
      listingSuspensionReason: undefined,
      updatedAt: now,
    });
    if (leadListingDetails) {
      updateListingDetails(leadListingDetails.id, { listingStatus: "active", updatedAt: now });
    }
  };

  const handleClosedElsewhere = (data: ClosedElsewhereData) => {
    const now = new Date().toISOString();
    const type = lead.leadType ?? "Buyer";
    const reasonLabel = (NOT_NOW_REASONS[type] ?? NOT_NOW_REASONS["Buyer"]).find((r) => r.value === data.reason)?.label ?? data.reason;
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
      title: `Not now — ${reasonLabel}`,
      description: data.notes || `Moved to nurture phase. Reason: ${reasonLabel}.`,
      createdAt: now, createdBy: currentAgent,
    });
    // 6-month nurture check-in
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    addReminder({
      id: `r-${genId()}-nurture6`, leadId: lead.id, leadName: fullName(lead),
      title: `Nurture check-in — ${lead.firstName} (closed elsewhere)`,
      dueDate: new Date(`${sixMonths.toISOString().slice(0,10)}T09:00:00`).toISOString(),
      createdAt: now, followUpStatus: "Long-Term Follow-Up", assignedTo: lead.assignedAgent,
      completed: false, priority: "low",
    });
    // 1-year nurture check-in
    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() + 1);
    addReminder({
      id: `r-${genId()}-nurture12`, leadId: lead.id, leadName: fullName(lead),
      title: `Annual check-in — ${lead.firstName} (closed elsewhere)`,
      dueDate: new Date(`${oneYear.toISOString().slice(0,10)}T09:00:00`).toISOString(),
      createdAt: now, followUpStatus: "Long-Term Follow-Up", assignedTo: lead.assignedAgent,
      completed: false, priority: "low",
    });
    updateLead(lead.id, {
      stage: "Closed",
      closeReason: "closed_elsewhere",
      relationshipStatus: "Past Client",
      followUpStatus: "Long-Term Follow-Up",
      updatedAt: now,
    });
    addNoteIfPresent(data.notes, now, "Not Now");
    closeModal();
  };

  const handleLeadLost = (data: LeadLostData) => {
    const now = new Date().toISOString();
    const reasonLabel = LEAD_LOST_REASONS.find((o) => o.value === data.reason)?.label ?? data.reason;
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
      title: `Lead lost — ${reasonLabel}`,
      description: data.notes || `Marked as lost: ${reasonLabel}.`,
      createdAt: now, createdBy: currentAgent,
    });
    updateLead(lead.id, {
      stage: "Lost",
      closeReason: "do_not_contact",
      followUpStatus: "Do Not Contact",
      lossReason: reasonLabel,
      updatedAt: now,
    });
    addNoteIfPresent(data.notes, now, "Mark as Lost");
    closeModal();
  };

  const handleLogSellerShowing = (data: Omit<SellerShowing, "id" | "leadId" | "createdBy" | "createdAt">) => {
    const now = new Date().toISOString();
    addSellerShowing({ id: `ss-${genId()}`, leadId: lead.id, createdBy: currentAgent, createdAt: now, ...data });
    const feedbackLabel: Record<string, string> = { positive: "Positive feedback", neutral: "Neutral feedback", negative: "Negative feedback", none: "No feedback" };
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "showing",
      title: `Showing logged — ${feedbackLabel[data.feedback]}`,
      description: [data.buyerAgentName && `Agent: ${data.buyerAgentName}`, data.notes].filter(Boolean).join(". ") || `Showing on ${data.showingDate}.`,
      createdAt: now, createdBy: currentAgent,
    });
    closeModal();
  };

  const handleLogOpenHouse = (data: Omit<OpenHouse, "id" | "leadId" | "createdBy" | "createdAt">) => {
    const now = new Date().toISOString();
    addOpenHouse({ id: `oh-${genId()}`, leadId: lead.id, createdBy: currentAgent, createdAt: now, ...data });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "showing",
      title: `Open house — ${new Date(`${data.date}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}${data.visitorCount !== undefined ? ` · ${data.visitorCount} visitors` : ""}`,
      description: data.notes || `Open house held on ${data.date}.`,
      createdAt: now, createdBy: currentAgent,
    });
    closeModal();
  };

  const handleMarkClosed = (data: MarkClosedData) => {
    const now = new Date().toISOString();
    const desc = [
      data.closedPrice && `Closed at ${data.closedPrice}`,
      data.closedDate && `Closing date: ${data.closedDate}`,
      data.referralPotential && `Referral potential: ${data.referralPotential}`,
      data.notes,
    ].filter(Boolean).join(". ");

    // Cancel all deal-related reminders — transaction is done
    cancelRemindersBySourceId(`listing-exp-${lead.id}`);
    cancelRemindersBySourceId(`listing-target-${lead.id}`);
    cancelRemindersBySourceId(`tenant-final-inspection-${lead.id}`);
    cancelRemindersBySourceId(`landlord-final-inspection-${lead.id}`);
    const ao = acceptedOffers.find((o) => o.leadId === lead.id);
    if (ao) {
      cancelRemindersBySourceId(`offer-close-${ao.id}`);
      // Cancel deposit reminders — thread-scoped (new) or legacy (offer-dep-)
      if (ao.threadId) {
        cancelRemindersBySourceIdPrefix(`deposit-${ao.threadId}`);
      } else {
        cancelRemindersBySourceId(`offer-dep-${ao.id}`);
      }
      // Cancel any condition reminders
      offerConditions
        .filter((c) => c.acceptedOfferId === ao.id)
        .forEach((c) => cancelRemindersBySourceId(`condition-${c.id}`));
      // Cancel inspection + title-search reminders — thread-scoped (new) or legacy
      if (ao.threadId) {
        cancelRemindersBySourceIdPrefix(`buyer-inspection-${ao.threadId}`);
        cancelRemindersBySourceIdPrefix(`title-search-${ao.threadId}`);
      } else {
        cancelRemindersBySourceIdPrefix(`buyer-inspection-${ao.id}`);
        cancelRemindersBySourceIdPrefix(`title-search-${ao.id}`);
      }
      // Update closing date on accepted offer if agent changed it
      if (data.closedDate && data.closedDate !== ao.closingDate) {
        updateAcceptedOffer(ao.id, { closingDate: data.closedDate, updatedAt: now });
      }
    }
    // Also cancel reminders for all lead threads (belt-and-suspenders)
    buyerOfferThreads.filter((t) => t.leadId === lead.id).forEach((t) => {
      cancelRemindersBySourceIdPrefix(`offer-expiry-${t.id}`);
      cancelRemindersBySourceIdPrefix(`deposit-${t.id}`);
      cancelRemindersBySourceIdPrefix(`title-search-${t.id}`);
      cancelRemindersBySourceIdPrefix(`buyer-inspection-${t.id}`);
    });

    // Write inspection_confirmed_at timestamp on Tenant close
    if (isTenantLead && data.finalInspectionConfirmed) {
      const tld = allTenantLeaseDetails.find((l) => l.leadId === lead.id);
      if (tld) updateTenantLeaseDetails(tld.id, { inspectionConfirmedAt: now });
    }

    // Write inspection_confirmed_at timestamp on Landlord close
    if (isLandlordLead && data.finalInspectionConfirmed) {
      const lease = allLeaseDetails.find((l) => l.leadId === lead.id);
      if (lease) updateLeaseDetails(lease.id, { inspectionConfirmedAt: now });
    }

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: "Transaction closed",
      description: desc || "Transaction completed successfully.",
      createdAt: now,
      createdBy: currentAgent,
    });
    updateLead(lead.id, { stage: "Closed", followUpStatus: "Paused", lastContactedAt: now, updatedAt: now });

    // Lease renewal check-in reminder — Tenant only, 60 days before lease end
    if (isTenantLead) {
      const tld = allTenantLeaseDetails.find((l) => l.leadId === lead.id);
      if (tld?.leaseEndDate) {
        const renewalDate = new Date(`${tld.leaseEndDate}T09:00:00`);
        renewalDate.setDate(renewalDate.getDate() - 60);
        const endFmt = new Date(`${tld.leaseEndDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
        addReminder({
          id: `r-${genId()}-renewal`,
          leadId: lead.id,
          leadName: fullName(lead),
          title: `🔑 Lease renewal check-in — ${lead.firstName}`,
          dueDate: renewalDate.toISOString(),
          createdAt: now,
          followUpStatus: lead.followUpStatus,
          assignedTo: lead.assignedAgent,
          completed: false,
          priority: "medium",
        });
        addActivity({
          id: `act-${genId()}`,
          leadId: lead.id,
          type: "follow_up_created",
          title: `Lease renewal reminder created — due ${renewalDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`,
          description: `Tenant's lease ends on ${endFmt}. Check in — are they renewing or looking to move? Great time to start the search early.`,
          createdAt: now,
          createdBy: "System",
        });
      }
    }

    // Move-in check-in reminder — Landlord only, 7 days after lease start date
    if (isLandlordLead) {
      const lease = allLeaseDetails.find((l) => l.leadId === lead.id);
      if (lease?.leaseStartDate) {
        const checkIn = new Date(`${lease.leaseStartDate}T09:00:00`);
        checkIn.setDate(checkIn.getDate() + 7);
        addReminder({
          id: `r-${genId()}-checkin`,
          leadId: lead.id,
          leadName: fullName(lead),
          title: `Move-in check-in — ${lead.firstName} ${lead.lastName}`,
          dueDate: checkIn.toISOString(),
          createdAt: now,
          followUpStatus: lead.followUpStatus,
          assignedTo: lead.assignedAgent,
          completed: false,
          priority: "medium",
        });
        addActivity({
          id: `act-${genId()}`,
          leadId: lead.id,
          type: "follow_up_created",
          title: `Move-in check-in reminder created — due ${checkIn.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`,
          description: `Reminder to follow up with landlord 7 days after tenant's move-in on ${new Date(`${lease.leaseStartDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}.`,
          createdAt: now,
          createdBy: "System",
        });
      }
    }

    // Auto-create Home Purchase Anniversary reminder (1 year from closing) — Buyer only
    const closingDateStr = lead.leadType === "Buyer" ? data.closedDate : null;
    if (closingDateStr) {
      const anniversary = new Date(`${closingDateStr}T09:00:00`);
      anniversary.setFullYear(anniversary.getFullYear() + 1);
      addReminder({
        id: `r-${genId()}-anniv`,
        leadId: lead.id,
        leadName: fullName(lead),
        title: `🏡 Home Purchase Anniversary — ${lead.firstName}`,
        dueDate: anniversary.toISOString(),
        createdAt: now,
        followUpStatus: "Paused",
        assignedTo: lead.assignedAgent,
        completed: false,
        priority: "medium",
      });
      addActivity({
        id: `act-${genId()}`,
        leadId: lead.id,
        type: "follow_up_created",
        title: `Anniversary reminder created — due ${new Date(anniversary).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`,
        description: `1 year since ${lead.firstName}'s closing on ${closingDateStr}. Great time to reconnect and ask for referrals.`,
        createdAt: now,
        createdBy: "System",
      });
    }

    addNoteIfPresent(data.notes, now, "Mark Closed");
    closeModal();
  };

  const handleSetFollowUp = (data: FollowUpData) => {
    const now = new Date().toISOString();
    addReminder({
      id: `r-${genId()}`,
      leadId: lead.id,
      leadName: fullName(lead),
      title: data.title,
      dueDate: new Date(data.dueDate).toISOString(),
      createdAt: now,
      followUpStatus: lead.followUpStatus,
      assignedTo: lead.assignedAgent,
      completed: false,
      priority: data.priority,
    });
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "follow_up_created",
      title: `Follow-up set: ${data.title}`,
      description: data.note || `Reminder created for ${new Date(data.dueDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}.`,
      createdAt: now,
      createdBy: currentAgent,
    });
    addNoteIfPresent(data.note, now, "Set Follow-Up");
    closeModal();
  };

  const handleMarkDone = (reminderId: string) => {
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return;
    // Always prompt for an outcome note so every completed task is logged
    setCompletingTaskReminder(reminder);
  };

  const handleMoveBack = (reason: string) => {
    const now = new Date().toISOString();
    // Per-pipeline ordered stages (forward direction, excluding terminal stages)
    const stageOrder: Record<string, PipelineStage[]> = {
      Buyer:   ["New", "Contacted", "Appointment Scheduled", "Showing / Active Search", "Offer", "Under Contract", "Closed"],
      Seller:  ["New", "Contacted", "Appointment Scheduled", "Pre-Listing", "Showing / Active Search", "Offer", "Under Contract", "Closed"],
      Landlord:["New", "Contacted", "Appointment Scheduled", "Pre-Listing", "Showing / Active Search", "Offer", "Under Contract", "Closed"],
      Tenant:  ["New", "Contacted", "Appointment Scheduled", "Showing / Active Search", "Offer", "Under Contract", "Closed"],
      Recruit: ["New", "Contacted", "Appointment Scheduled", "Showing / Active Search", "Under Contract", "Closed"],
    };
    const order = stageOrder[lead.leadType ?? "Buyer"] ?? stageOrder["Buyer"];
    const idx = order.indexOf(lead.stage as PipelineStage);
    if (idx <= 0) return; // Already at New or not found
    const prevStage = order[idx - 1];
    const fromDisplay = getStageDisplayName(lead.stage as PipelineStage, lead.leadType);
    const toDisplay   = getStageDisplayName(prevStage, lead.leadType);
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: `Stage moved back: ${fromDisplay} → ${toDisplay}`,
      description: reason || `Stage revised from ${fromDisplay} to ${toDisplay}.`,
      createdAt: now,
      createdBy: currentAgent,
    });
    addNoteIfPresent(reason, now, "Move Back One Stage");
    updateLead(lead.id, { stage: prevStage, updatedAt: now });
    closeModal();
  };

  const handleCompleteTaskWithNote = (reminder: Reminder, notes: string) => {
    const now = new Date().toISOString();
    completeReminder(reminder.id);
    // If this reminder was linked to a checklist item, mark it done too
    if (reminder.sourceId) {
      const linkedItem = leadChecklistItems.find((c) => c.id === reminder.sourceId && c.status !== "done");
      if (linkedItem) updateChecklistItem(linkedItem.id, { status: "done", completedBy: currentAgent, completedAt: now, updatedAt: now });
    }
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "task_completed",
      title: `Task completed — ${reminder.title}`,
      description: notes,
      createdAt: now,
      createdBy: currentAgent,
    });
    setCompletingTaskReminder(null);
  };

  const handleRemindChecklistItem = (itemId: string, dueDate: string) => {
    const now = new Date().toISOString();
    const item = checklistItems.find((c) => c.id === itemId && c.leadId === lead.id);
    if (!item || item.status === "done") return;

    updateChecklistItem(itemId, {
      reminderDueDate: dueDate,
      updatedAt: now,
    });

    addReminder({
      id: `r-${genId()}`,
      leadId: lead.id,
      leadName: fullName(lead),
      title: item.name,
      dueDate,
      createdAt: now,
      followUpStatus: lead.followUpStatus,
      assignedTo: lead.assignedAgent,
      completed: false,
      priority: "medium",
      sourceId: itemId,
    });

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "checklist",
      title: `Reminder set: ${item.name}`,
      description: `Reminder scheduled for ${new Date(dueDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}.`,
      createdAt: now,
      createdBy: currentAgent,
    });
  };

  const handleCompleteChecklistItem = (itemId: string, note?: string) => {
    const now = new Date().toISOString();
    const item = checklistItems.find((c) => c.id === itemId && c.leadId === lead.id);
    if (!item || item.status === "done") return;

    updateChecklistItem(itemId, {
      status: "done",
      completedBy: currentAgent,
      completedAt: now,
      optionalNote: note?.trim() || undefined,
      updatedAt: now,
    });

    // Close any reminder that was created for this checklist item
    const linkedReminder = reminders.find((r) => !r.completed && r.sourceId === itemId);
    if (linkedReminder) completeReminder(linkedReminder.id);

    // Auto-set depositCollected when the deposit checklist task is completed
    const isDepositTask = item.name.toLowerCase().includes("deposit");
    if (isDepositTask) {
      // Landlord lease details
      const ld = allLeaseDetails.find((l) => l.leadId === lead.id);
      if (ld) updateLeaseDetails(ld.id, { depositCollected: true, updatedAt: now });
      // Tenant lease details
      const tld = allTenantLeaseDetails.find((l) => l.leadId === lead.id);
      if (tld) updateTenantLeaseDetails(tld.id, { depositPaid: true, updatedAt: now });
    }

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "checklist",
      title: `Checklist task completed: ${item.name}`,
      description: note?.trim() || `Completed by ${currentAgent}.`,
      createdAt: now,
      createdBy: currentAgent,
    });

    // Check if all tasks are now done
    const stillOpen = leadChecklistItems.filter((c) => c.status === "open" && c.id !== itemId);
    if (stillOpen.length === 0) {
      addActivity({
        id: `act-${genId()}`,
        leadId: lead.id,
        type: "checklist",
        title: "Under Contract checklist complete — all 4 tasks done",
        description: "All standard Under Contract tasks have been completed.",
        createdAt: now,
        createdBy: currentAgent,
      });
    }
  };

  const handleResolveCondition = (condId: string, resolution: "waived") => {
    const now = new Date().toISOString();
    const cond = leadConditions.find((c) => c.id === condId);
    if (!cond || cond.resolution !== "pending") return;

    updateOfferCondition(condId, { resolution, resolvedAt: now, updatedAt: now });
    cancelRemindersBySourceId(`offer-cond-${condId}`);

    const label = cond.conditionType === "other" && cond.conditionLabel
      ? cond.conditionLabel : CONDITION_TYPE_LABELS[cond.conditionType];

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "offer",
      title: `Condition ${resolution} — ${label}`,
      description: `${label} condition marked ${resolution} by ${currentAgent}.`,
      createdAt: now,
      createdBy: currentAgent,
    });

    // If all conditions now resolved, auto-advance to Under Contract
    const updatedConditions = leadConditions.map((c) =>
      c.id === condId ? { ...c, resolution, resolvedAt: now } : c
    );
    if (computeDealStatus(updatedConditions) === "firm") {
      updateLead(lead.id, { stage: "Under Contract", updatedAt: now });
      addActivity({
        id: `act-${genId()}`,
        leadId: lead.id,
        type: "stage_change",
        title: `All conditions cleared — moved to ${getStageDisplayName("Under Contract", lead.leadType)}`,
        description: `All conditions resolved. Deal is now firm.`,
        createdAt: now,
        createdBy: currentAgent,
      });
      setShowConditionsModal(false);
      triggerUnderContractChecklist();
      setConditionsToast(true);
      setTimeout(() => setConditionsToast(false), 4000);
    }
  };

  // ---- Seller handlers ----

  const triggerPreListingChecklist = () => {
    // Guard — only create once per lead
    const existing = checklistItems.filter(
      (c) => c.leadId === lead.id && c.checklistType === "pre_listing"
    );
    if (existing.length > 0) {
      setShowPreListingChecklistModal(true);
      return;
    }
    const now = new Date().toISOString();
    const ts = Date.now();
    const plTasks = isLandlordLead ? LANDLORD_PRE_LISTING_CHECKLIST_TASKS : PRE_LISTING_CHECKLIST_TASKS;
    const newItems: ChecklistItem[] = plTasks.map((name, i) => ({
      id: `cl-pl-${ts}-${i}`,
      leadId: lead.id,
      name,
      status: "open" as const,
      autoCreated: true,
      checklistType: "pre_listing" as const,
      createdAt: now,
      updatedAt: now,
    }));
    addChecklistItems(newItems);
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "checklist",
      title: `Pre-listing checklist created — ${newItems.length} tasks`,
      description: "Standard pre-listing prep tasks auto-created.",
      createdAt: now,
      createdBy: "System",
    });
    setShowPreListingChecklistModal(true);
  };

  const handleSignListing = (data: SignListingData) => {
    const now = new Date().toISOString();
    const parsedPrice = data.expectedPrice ? parseFloat(data.expectedPrice.replace(/[^0-9.]/g, "")) || undefined : undefined;

    // Create listing details record
    const ld: ListingDetails = {
      id: `ld-${genId()}`,
      leadId: lead.id,
      listingAgreementSignedDate: data.signedDate || undefined,
      listingAgreementExpiryDate: data.expiryDate || undefined,
      expectedListingPrice: parsedPrice,
      targetListDate: data.targetListDate || undefined,
      listingStatus: "active",
      extensionCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    addListingDetails(ld);

    // Listing agreement expiry reminders
    if (data.expiryDate) {
      const expiryMs = new Date(`${data.expiryDate}T09:00:00`).getTime();
      const now7 = new Date(expiryMs - 7 * 86_400_000).toISOString();
      const now0 = new Date(expiryMs).toISOString();
      if (expiryMs - Date.now() > 7 * 86_400_000) {
        addReminder({
          id: `r-${genId()}-exp7`, leadId: lead.id, leadName: fullName(lead),
          title: `Listing agreement expires in 7 days — ${lead.firstName} ${lead.lastName}`,
          dueDate: now7, createdAt: now,
          followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "medium", sourceId: `listing-exp-${lead.id}`,
        });
      }
      addReminder({
        id: `r-${genId()}-exp0`, leadId: lead.id, leadName: fullName(lead),
        title: `Listing agreement expires today — ${lead.firstName} ${lead.lastName}`,
        dueDate: now0, createdAt: now,
        followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: "high", sourceId: `listing-exp-${lead.id}`,
      });
    }

    // Target list date reminders — 2 days before + day of (skip past dates)
    if (data.targetListDate) {
      const targetMs = new Date(`${data.targetListDate}T09:00:00`).getTime();
      const nowMs = Date.now();
      cancelRemindersBySourceId(`listing-target-${lead.id}`);
      if (targetMs - 2 * 86_400_000 > nowMs) {
        addReminder({
          id: `r-${genId()}-tld2`, leadId: lead.id, leadName: fullName(lead),
          title: `📋 Target list date in 2 days — ${fullName(lead)}`,
          dueDate: new Date(targetMs - 2 * 86_400_000).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "medium", sourceId: `listing-target-${lead.id}`,
        });
      }
      if (targetMs > nowMs) {
        addReminder({
          id: `r-${genId()}-tld0`, leadId: lead.id, leadName: fullName(lead),
          title: `📋 Target list date today — ${fullName(lead)}`,
          dueDate: new Date(targetMs).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `listing-target-${lead.id}`,
        });
      }
    }

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: "Listing agreement signed — moved to Pre-Listing",
      description: [
        data.expiryDate && `Agreement expires ${new Date(`${data.expiryDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`,
        parsedPrice && `Expected price: $${parsedPrice.toLocaleString("en-CA")}`,
        data.notes,
      ].filter(Boolean).join(". "),
      createdAt: now,
      createdBy: currentAgent,
    });

    updateLead(lead.id, {
      stage: "Pre-Listing",
      ...(parsedPrice && { budget: `$${parsedPrice.toLocaleString("en-CA")}` }),
      ...(!lead.preListingAt && { preListingAt: now }),
      updatedAt: now,
    });
    addNoteIfPresent(data.notes, now, "Sign Listing Agreement");
    closeModal();
    triggerPreListingChecklist();
  };

  const handleSubmitApplication = () => {
    const now = new Date().toISOString();
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: "Application submitted — moved to Application Submitted",
      description: "Tenant has submitted an application. Log details in the panel below.",
      createdAt: now,
      createdBy: currentAgent,
    });
    updateLead(lead.id, { stage: "Offer", lastContactedAt: now, updatedAt: now, ...clearPauseIfNeeded() });
  };

  const handleTenantLost = (data: LandlordLostData) => {
    const now = new Date().toISOString();
    updateLead(lead.id, { stage: "Lost", lossReason: data.reason, updatedAt: now });
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: "Lead marked as Inactive",
      description: [data.reason, data.notes].filter(Boolean).join(". "),
      createdAt: now,
      createdBy: currentAgent,
    });
    addNoteIfPresent(data.notes, now, "Mark Tenant Lost");
    closeModal();
  };

  const handleLogApplicationReceived = () => {
    const now = new Date().toISOString();
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: "Application received — moved to Application Received",
      description: "A tenant application has been received. Log application details in the panel below.",
      createdAt: now,
      createdBy: currentAgent,
    });
    updateLead(lead.id, { stage: "Offer", lastContactedAt: now, updatedAt: now, ...clearPauseIfNeeded() });
  };

  const handleLandlordLost = (data: LandlordLostData) => {
    const now = new Date().toISOString();
    const reasonLabel = LANDLORD_LOSS_REASONS.find((r) => r.value === data.reason)?.label ?? data.reason;
    updateLead(lead.id, { stage: "Lost", lossReason: data.reason, updatedAt: now });
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: "Lead marked as Inactive",
      description: [reasonLabel, data.notes].filter(Boolean).join(". "),
      createdAt: now,
      createdBy: currentAgent,
    });
    addNoteIfPresent(data.notes, now, "Mark Landlord Lost");
    closeModal();
  };

  const handleLogOfferReceived = () => {
    const now = new Date().toISOString();
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: "Offer received — moved to Offer Received",
      description: "An offer has been received. Log offer details in the panel below.",
      createdAt: now,
      createdBy: currentAgent,
    });
    updateLead(lead.id, { stage: "Offer", lastContactedAt: now, updatedAt: now, ...clearPauseIfNeeded() });
  };

  const handleListOnMLS = (data: ListOnMLSData) => {
    const now = new Date().toISOString();
    const parsedPrice = data.finalListPrice ? parseFloat(data.finalListPrice.replace(/[^0-9.]/g, "")) || undefined : undefined;

    if (leadListingDetails) {
      updateListingDetails(leadListingDetails.id, {
        mlsNumber: data.mlsNumber.trim() || undefined,
        actualListDate: data.actualListDate || undefined,
        ...(parsedPrice && { expectedListingPrice: parsedPrice }),
        updatedAt: now,
      });
    }

    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "stage_change",
      title: isLandlordLead
        ? "Property listed for rent — moved to Listed / Active"
        : "Property listed on MLS — moved to Listed / Active",
      description: [
        data.mlsNumber && `MLS# ${data.mlsNumber}`,
        data.actualListDate && `Listed ${new Date(`${data.actualListDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`,
        parsedPrice && (isLandlordLead ? `Monthly rent: $${parsedPrice.toLocaleString("en-CA")}` : `List price: $${parsedPrice.toLocaleString("en-CA")}`),
        data.notes,
      ].filter(Boolean).join(". "),
      createdAt: now,
      createdBy: currentAgent,
    });

    updateLead(lead.id, { stage: "Showing / Active Search", updatedAt: now });
    addNoteIfPresent(data.notes, now, isLandlordLead ? "List for Rent" : "List on MLS");
    closeModal();
  };

  const handleSellerOfferLost = (data: { reListing: boolean; lossReason?: string; notes: string }) => {
    const now = new Date().toISOString();
    if (data.reListing) {
      updateLead(lead.id, { stage: "Pre-Listing", updatedAt: now });
      addActivity({
        id: `act-${genId()}`,
        leadId: lead.id,
        type: "stage_change",
        title: "Offer lost — re-listing in progress",
        description: data.notes || "Seller is re-listing the property.",
        createdAt: now,
        createdBy: currentAgent,
      });
      addNoteIfPresent(data.notes, now, "Offer Lost — Re-listing");
      closeModal();
      // Re-trigger pre-listing checklist for the new listing attempt
      triggerPreListingChecklist();
    } else {
      const reasonLabel = SELLER_LOSS_REASONS.find((r) => r.value === data.lossReason)?.label ?? data.lossReason ?? "Unknown";
      updateLead(lead.id, { stage: "Lost", lossReason: data.lossReason, updatedAt: now });
      addActivity({
        id: `act-${genId()}`,
        leadId: lead.id,
        type: "stage_change",
        title: `Offer lost — lead marked as Inactive`,
        description: [reasonLabel, data.notes].filter(Boolean).join(". "),
        createdAt: now,
        createdBy: currentAgent,
      });
      addNoteIfPresent(data.notes, now, "Offer Lost");
      closeModal();
    }
  };

  const handleListingExpiredWithdrawn = (data: { action: "relist" | "lost"; lossReason?: string; notes: string }) => {
    const now = new Date().toISOString();
    if (data.action === "relist") {
      // Clear expiry date, move back to Pre-Listing
      if (leadListingDetails) {
        updateListingDetails(leadListingDetails.id, {
          listingAgreementExpiryDate: undefined,
          mlsNumber: undefined,
          actualListDate: undefined,
          updatedAt: now,
        });
      }
      updateLead(lead.id, { stage: "Pre-Listing", updatedAt: now });
      addActivity({
        id: `act-${genId()}`,
        leadId: lead.id,
        type: "stage_change",
        title: "Listing expired — re-listing in progress",
        description: data.notes || "New listing agreement required. Prep checklist re-created.",
        createdAt: now,
        createdBy: currentAgent,
      });
      addNoteIfPresent(data.notes, now, "Listing Expired — Re-listing");
      closeModal();
      // Re-create prep checklist for the new listing
      const existingPreListing = checklistItems.filter(
        (c) => c.leadId === lead.id && c.checklistType === "pre_listing"
      );
      // Clear existing open items and re-create
      existingPreListing
        .filter((c) => c.status === "open")
        .forEach((c) => updateChecklistItem(c.id, { status: "done", completedAt: now, optionalNote: "Cleared for re-listing", updatedAt: now }));
      setTimeout(() => triggerPreListingChecklist(), 50);
    } else {
      const lossReasonsList = isLandlordLead ? LANDLORD_LOSS_REASONS : SELLER_LOSS_REASONS;
      const reasonLabel = lossReasonsList.find((r) => r.value === data.lossReason)?.label ?? data.lossReason ?? "Unknown";
      updateLead(lead.id, { stage: "Lost", lossReason: data.lossReason, updatedAt: now });
      addActivity({
        id: `act-${genId()}`,
        leadId: lead.id,
        type: "stage_change",
        title: "Listing expired / withdrawn — lead marked as Inactive",
        description: [reasonLabel, data.notes].filter(Boolean).join(". "),
        createdAt: now,
        createdBy: currentAgent,
      });
      addNoteIfPresent(data.notes, now, "Listing Expired / Withdrawn");
      closeModal();
    }
  };

  const triggerUnderContractChecklist = (threadId?: string) => {
    const now = new Date().toISOString();
    const ts = Date.now();

    if (leadChecklistItems.length > 0) {
      // Detect property change: existing items were created for a different thread
      const existingThreadId = leadChecklistItems[0]?.sourceThreadId;
      const isDifferentThread = threadId && existingThreadId && threadId !== existingThreadId;

      if (!isDifferentThread) {
        setShowChecklistModal(true);
        return;
      }

      // Reset: mark all open items done so history is preserved
      leadChecklistItems.filter((i) => i.status === "open").forEach((i) =>
        updateChecklistItem(i.id, { status: "done", updatedAt: now })
      );
    }
    const tasks = isRecruitLead
      ? RECRUIT_JOINED_CHECKLIST_TASKS
      : isLandlordLead
      ? LANDLORD_LEASE_SIGNED_CHECKLIST_TASKS
      : isTenantLead
      ? TENANT_LEASE_SIGNED_CHECKLIST_TASKS
      : isSellerLead
      ? SELLER_UNDER_CONTRACT_CHECKLIST_TASKS
      : UNDER_CONTRACT_CHECKLIST_TASKS;
    const newItems: ChecklistItem[] = tasks.map((name, i) => ({
      id: `cl-${ts}-${i}`,
      leadId: lead.id,
      name,
      status: "open" as const,
      autoCreated: true,
      checklistType: "under_contract" as const,
      ...(threadId && { sourceThreadId: threadId }),
      createdAt: now,
      updatedAt: now,
    }));
    addChecklistItems(newItems);
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "checklist",
      title: `Under Contract checklist created — ${newItems.length} tasks`,
      description: "Standard Under Contract tasks auto-created.",
      createdAt: now,
      createdBy: "System",
    });
    setShowChecklistModal(true);
  };

  const handleAddShowing = (data: ShowingFormData) => {
    const now = new Date().toISOString();
    const showing: Showing = {
      id: `sh-${Date.now()}`,
      leadId: lead.id,
      mlsNumber: data.mlsNumber.trim() || undefined,
      address: data.address.trim(),
      visitDate: data.visitDate,
      notes: data.notes.trim() || undefined,
      createdBy: currentAgent,
      createdAt: now,
      updatedAt: now,
    };
    addShowing(showing);
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "showing",
      title: `Showing logged — ${showing.address}`,
      description: [
        data.mlsNumber.trim() && `MLS# ${data.mlsNumber.trim()}`,
        `Visited ${new Date(`${data.visitDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`,
        data.notes.trim(),
      ].filter(Boolean).join(". "),
      createdAt: now,
      createdBy: currentAgent,
    });
    closeModal();
  };

  const handleEditShowing = (data: ShowingFormData) => {
    if (!editingShowing) return;
    const now = new Date().toISOString();
    updateShowing(editingShowing.id, {
      mlsNumber: data.mlsNumber.trim() || undefined,
      address: data.address.trim(),
      visitDate: data.visitDate,
      notes: data.notes.trim() || undefined,
      updatedAt: now,
    });
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "showing_edited",
      title: `Showing updated — ${data.address.trim()}`,
      description: `Showing record edited by ${currentAgent}.`,
      createdAt: now,
      createdBy: currentAgent,
    });
    setEditingShowing(null);
    closeModal();
  };

  const handleDeleteShowing = (showing: Showing) => {
    const now = new Date().toISOString();
    deleteShowing(showing.id);
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "showing_deleted",
      title: `Showing removed — ${showing.address}`,
      description: `Showing record deleted by ${currentAgent}.`,
      createdAt: now,
      createdBy: currentAgent,
    });
  };

  const handleScheduleShowing = (data: ScheduleShowingFormData) => {
    const now = new Date().toISOString();
    const scheduledDateTime = `${data.scheduledDate}T${data.scheduledTime}:00`;
    const displayDate = new Date(`${data.scheduledDate}T${data.scheduledTime}`).toLocaleString("en-CA", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    addReminder({
      id: `r-${genId()}`,
      leadId: lead.id,
      leadName: fullName(lead),
      title: `Showing — ${data.address.trim()}`,
      dueDate: new Date(scheduledDateTime).toISOString(),
      createdAt: now,
      followUpStatus: lead.followUpStatus,
      assignedTo: lead.assignedAgent,
      completed: false,
      priority: data.priority,
      showingTask: {
        mlsNumber: data.mlsNumber.trim() || undefined,
        address: data.address.trim(),
        scheduledDate: scheduledDateTime,
        preVisitNotes: data.preVisitNotes.trim() || undefined,
      },
    });
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "follow_up_created",
      title: `Showing scheduled — ${data.address.trim()}`,
      description: [
        data.mlsNumber.trim() && `MLS# ${data.mlsNumber.trim()}`,
        `Scheduled for ${displayDate}`,
        data.preVisitNotes.trim(),
      ].filter(Boolean).join(". "),
      createdAt: now,
      createdBy: currentAgent,
    });
    closeModal();
  };

  const handleCompleteShowingTask = (reminder: Reminder, data: CompleteShowingData) => {
    const now = new Date().toISOString();
    const showing: Showing = {
      id: `sh-${Date.now()}`,
      leadId: lead.id,
      mlsNumber: data.mlsNumber.trim() || undefined,
      address: data.address.trim(),
      visitDate: data.visitDate,
      notes: data.notes.trim() || undefined,
      createdBy: currentAgent,
      createdAt: now,
      updatedAt: now,
    };
    addShowing(showing);
    completeReminder(reminder.id);
    addActivity({
      id: `act-${genId()}`,
      leadId: lead.id,
      type: "showing",
      title: `Showing completed — ${showing.address}`,
      description: [
        showing.mlsNumber && `MLS# ${showing.mlsNumber}`,
        `Visited ${new Date(`${data.visitDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`,
        data.notes.trim(),
      ].filter(Boolean).join(". "),
      createdAt: now,
      createdBy: currentAgent,
    });
    setCompletingShowingReminder(null);
  };

  // ---- Render ----

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-4">
        <Link href="/leads" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Leads
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar name={fullName(lead)} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-zinc-900">{fullName(lead)}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <StageBadge stage={lead.stage} leadType={lead.leadType} />
              <QualificationBadge status={lead.qualificationStatus} />
              <RelationshipBadge status={lead.relationshipStatus} />
              {lead.leadType && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  {lead.leadType}
                </span>
              )}
              {isTenantLead && lead.applicationReadiness && (
                <ApplicationReadinessBadge status={lead.applicationReadiness} />
              )}
              {(lead.leadType === "Buyer" || lead.leadType === "Investor") && lead.financingStatus && (
                <FinancingBadge status={lead.financingStatus} />
              )}
              {(isSellerLead || isLandlordLead) && leadListingDetails?.listingAgreementExpiryDate && (
                <ListingExpiryBadge
                  expiryDate={leadListingDetails.listingAgreementExpiryDate}
                  label={isLandlordLead ? "Rental exp." : "Listing exp."}
                />
              )}
              {lead.followUpStatus === "Paused" && (isBuyerLead || isTenantLead) && lead.stage !== "Closed" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  ⏸ {lead.pauseReturnDate
                    ? `Paused · Returns ${new Date(`${lead.pauseReturnDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`
                    : "Search Paused"}
                </span>
              ) : lead.followUpStatus === "Paused" && lead.stage !== "Closed" ? (
                <FollowUpBadge status={lead.followUpStatus} />
              ) : null}
            </div>
            <p className="text-xs text-zinc-400 mt-1">{lead.assignedAgent} · <span className="text-zinc-300">Source:</span> {lead.source}</p>
          </div>
        </div>

        {/* Stage banner */}
        {stageBanner && (
          <div className={cn("rounded-xl border px-4 py-3 flex items-center gap-3", stageBanner.bg, stageBanner.border)}>
            <span className="text-base shrink-0">{stageBanner.icon}</span>
            <div>
              <p className={cn("text-sm font-medium", stageBanner.textColor)}>{stageBanner.text}</p>
              {showResponseWarning && lead.stage === "New" ? (
                <p className="text-xs text-amber-600 mt-0.5">
                  Waiting {Math.round(hoursOld)}h for first outreach. First contact recommended within 1 hour.
                </p>
              ) : (
                <p className={cn("text-xs mt-0.5 opacity-75", stageBanner.textColor)}>{stageBanner.sub}</p>
              )}
            </div>
          </div>
        )}

        {/* Listing expired banner (Seller / Landlord) */}
        {isListingExpired && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">
                Listing agreement expired on {new Date(`${leadListingDetails!.listingAgreementExpiryDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })} — action required
              </p>
              <p className="text-xs text-red-600 mt-0.5">Use the Listing Agreement panel below to Extend or Terminate, or choose a pipeline action.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button"
                onClick={() => handleListingExpiredWithdrawn({ action: "relist", notes: "" })}
                className="text-xs font-medium text-sky-700 border border-sky-200 rounded-lg px-2.5 py-1.5 hover:bg-sky-50 transition-colors">
                Re-listing
              </button>
              <button type="button"
                onClick={() => setActiveModal("listingExpiredWithdrawn")}
                className="text-xs font-medium text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-100 transition-colors">
                Mark as Lost
              </button>
            </div>
          </div>
        )}

        {/* Listing suspension banner (Seller / Landlord) */}
        {(isSellerLead || isLandlordLead) && lead.followUpStatus === "Paused" && lead.listingSuspensionEndDate && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
            <span className="text-base shrink-0">⏸</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                Listing suspended · Resumes {new Date(`${lead.listingSuspensionEndDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              {lead.listingSuspensionReason && (
                <p className="text-xs text-amber-600 mt-0.5">{lead.listingSuspensionReason}</p>
              )}
            </div>
          </div>
        )}

        {/* Search pause banner (Buyer / Tenant) */}
        {(isBuyerLead || isTenantLead) && lead.followUpStatus === "Paused" && lead.stage !== "Closed" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
            <span className="text-base shrink-0">⏸</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                Search paused{lead.pauseReason ? ` — ${lead.pauseReason}` : ""}
                {lead.pauseReturnDate ? ` · Returns ${new Date(`${lead.pauseReturnDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}` : ""}
              </p>
            </div>
          </div>
        )}

        {/* Conditions pending banner */}
        {isConditional && (
          <button type="button" onClick={() => setShowConditionsModal(true)}
            className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3 text-left hover:bg-amber-100/70 transition-colors">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                {pendingConditionsCount} condition{pendingConditionsCount !== 1 ? "s" : ""} pending — resolve to advance stage
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Tap to review and resolve</p>
            </div>
            <span className="text-amber-400 shrink-0 text-sm">→</span>
          </button>
        )}

        {/* Active client banner */}
        {isConverted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-emerald-600 text-base shrink-0">✓</span>
            <div>
              <p className="text-sm font-medium text-emerald-800">
                {isRecruitLead
                  ? "Active recruit — in conversation"
                  : isTenantLead
                  ? "Active tenant — past conversion point"
                  : isLandlordLead
                  ? lead.stage === "Pre-Listing"
                    ? "Active landlord — rental agreement signed"
                    : "Active landlord — property listed"
                  : isSellerLead
                  ? lead.stage === "Pre-Listing"
                    ? "Active seller — listing agreement signed"
                    : "Active seller — property listed"
                  : "Active buyer — past conversion point"}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {isRecruitLead
                  ? "Recruiting is in progress. Keep momentum with regular follow-up."
                  : isTenantLead
                  ? "Tenant is actively searching for a rental. Priority follow-up applies."
                  : isLandlordLead
                  ? lead.stage === "Pre-Listing"
                    ? "Complete pre-listing checklist and list the property when ready."
                    : "Property is listed for rent. Monitor applications and keep landlord informed."
                  : isSellerLead
                  ? lead.stage === "Pre-Listing"
                    ? "Complete the pre-listing checklist, then list on MLS when ready."
                    : "Property is live on MLS. Monitor offers and keep seller informed."
                  : "This lead is in active search. Priority follow-up applies."}
              </p>
            </div>
          </div>
        )}

        {/* 3-col grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {/* Left col */}
          <div className="space-y-4 order-2 md:order-1">
            <Card padding="md">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Contact</h2>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <a href={`tel:${phoneDigits}`} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-colors">
                  <span className="text-lg">📞</span>
                  <span className="text-xs text-zinc-600 font-medium">Call</span>
                </a>
                <a href={`sms:${phoneDigits}`} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-colors">
                  <span className="text-lg">💬</span>
                  <span className="text-xs text-zinc-600 font-medium">SMS</span>
                </a>
                <a href={`mailto:${lead.email}`} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-colors">
                  <span className="text-lg">✉️</span>
                  <span className="text-xs text-zinc-600 font-medium">Email</span>
                </a>
                <a href={`https://wa.me/1${phoneDigits}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-colors">
                  <span className="text-lg">💚</span>
                  <span className="text-xs text-zinc-600 font-medium">WhatsApp</span>
                </a>
              </div>
              <dl className="space-y-2.5">
                {lead.phone && <div><dt className="text-xs text-zinc-400">Phone</dt><dd className="text-sm text-zinc-800 mt-0.5">{lead.phone}</dd></div>}
                {lead.email && <div><dt className="text-xs text-zinc-400">Email</dt><dd className="text-sm text-zinc-800 mt-0.5 break-all">{lead.email}</dd></div>}
                <div><dt className="text-xs text-zinc-400">Source</dt><dd className="text-sm text-zinc-800 mt-0.5">{lead.source}</dd></div>
                <div>
                  <dt className="text-xs text-zinc-400">Assigned Agent</dt>
                  <dd className="flex items-center gap-2 mt-0.5">
                    <Avatar name={lead.assignedAgent} size="sm" />
                    <span className="text-sm text-zinc-800">{lead.assignedAgent}</span>
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Recruit Profile card */}
            {isRecruitLead && (lead.currentBrokerage || lead.yearsExperience || lead.annualTransactionVolume || lead.specialization || lead.areasOfFocus || lead.expectedCommissionSplit) && (
              <Card padding="md">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Recruit Profile</h2>
                <dl className="space-y-2.5">
                  {lead.currentBrokerage && <div><dt className="text-xs text-zinc-400">Current Brokerage</dt><dd className="text-sm text-zinc-800 mt-0.5 font-medium">{lead.currentBrokerage}</dd></div>}
                  {lead.yearsExperience && <div><dt className="text-xs text-zinc-400">Experience</dt><dd className="text-sm text-zinc-800 mt-0.5">{YEARS_EXPERIENCE_OPTIONS.find(o => o.value === lead.yearsExperience)?.label ?? lead.yearsExperience}</dd></div>}
                  {lead.annualTransactionVolume && <div><dt className="text-xs text-zinc-400">Annual Volume</dt><dd className="text-sm text-zinc-800 mt-0.5">{{ "under_5": "Under 5 deals/year", "5_to_12": "5–12 deals/year", "13_to_24": "13–24 deals/year", "over_25": "25+ deals/year" }[lead.annualTransactionVolume] ?? lead.annualTransactionVolume}</dd></div>}
                  {lead.specialization && <div><dt className="text-xs text-zinc-400">Specialization</dt><dd className="text-sm text-zinc-800 mt-0.5">{lead.specialization}</dd></div>}
                  {lead.areasOfFocus && <div><dt className="text-xs text-zinc-400">Areas of Focus</dt><dd className="text-sm text-zinc-800 mt-0.5">{lead.areasOfFocus}</dd></div>}
                  {lead.expectedCommissionSplit && <div><dt className="text-xs text-zinc-400">Expected Split</dt><dd className="text-sm text-zinc-800 mt-0.5 font-medium">{lead.expectedCommissionSplit}</dd></div>}
                  {lead.joinDate && <div><dt className="text-xs text-zinc-400">Join Date</dt><dd className="text-sm text-zinc-800 mt-0.5">{new Date(`${lead.joinDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</dd></div>}
                </dl>
              </Card>
            )}

            {!isRecruitLead && (lead.budget || lead.propertyType || (lead.preferredAreas && lead.preferredAreas.length > 0) || lead.clientTimeline || leadListingDetails?.targetListDate) && (
              <Card padding="md">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Preferences</h2>
                <dl className="space-y-2.5">
                  {lead.budget && <div><dt className="text-xs text-zinc-400">{isSellerLead ? "Asking Price" : isLandlordLead ? "Expected Rent" : isTenantLead ? "Rental Budget" : "Budget"}</dt><dd className="text-sm text-zinc-800 mt-0.5 font-medium">{lead.budget}</dd></div>}
                  {lead.propertyType && <div><dt className="text-xs text-zinc-400">Property Type</dt><dd className="text-sm text-zinc-800 mt-0.5">{lead.propertyType}</dd></div>}
                  {lead.preferredAreas && lead.preferredAreas.length > 0 && (
                    <div>
                      <dt className="text-xs text-zinc-400">Preferred Areas</dt>
                      <dd className="flex flex-wrap gap-1 mt-1">
                        {lead.preferredAreas.map((area) => (
                          <span key={area} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{area}</span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {lead.clientTimeline && <div><dt className="text-xs text-zinc-400">Client Timeline</dt><dd className="text-sm text-zinc-800 mt-0.5">{lead.clientTimeline}</dd></div>}
                  {isSellerLead && lead.closingDateExpectation && (
                    <div>
                      <dt className="text-xs text-zinc-400">Closing Timeline</dt>
                      <dd className="text-sm text-zinc-800 mt-0.5">
                        {["30","60","90"].includes(lead.closingDateExpectation)
                          ? `${lead.closingDateExpectation} days`
                          : lead.closingDateExpectation}
                      </dd>
                    </div>
                  )}
                  {lead.timelineNotes && <div><dt className="text-xs text-zinc-400">Timeline Notes</dt><dd className="text-sm text-zinc-500 mt-0.5 leading-relaxed">{lead.timelineNotes}</dd></div>}
                  {(isSellerLead || isLandlordLead) && leadListingDetails?.targetListDate && (
                    <div>
                      <dt className="text-xs text-zinc-400">Target List Date</dt>
                      <dd className="text-sm text-zinc-800 mt-0.5">
                        {new Date(`${leadListingDetails.targetListDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            )}

            <Card padding="md">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Follow-Up Status</h2>
              <FollowUpBadge status={lead.followUpStatus} />
              {lead.notes && (
                <p className="text-xs text-zinc-500 mt-3 leading-relaxed border-t border-zinc-100 pt-3">{lead.notes}</p>
              )}
            </Card>

            {lead.tags && lead.tags.length > 0 && (
              <Card padding="md">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-zinc-900 text-white px-2.5 py-1 rounded-full">#{tag}</span>
                  ))}
                </div>
              </Card>
            )}

            <Card padding="md">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Record</h2>
              <dl className="space-y-2">
                <div className="flex justify-between"><dt className="text-xs text-zinc-400">Created</dt><dd className="text-xs text-zinc-600">{formatDate(lead.createdAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-zinc-400">Updated</dt><dd className="text-xs text-zinc-600">{formatDate(lead.updatedAt)}</dd></div>
                {lead.lastContactedAt && (
                  <div className="flex justify-between"><dt className="text-xs text-zinc-400">Last Contact</dt><dd className="text-xs text-zinc-600">{formatDate(lead.lastContactedAt)}</dd></div>
                )}
              </dl>
            </Card>
          </div>

          {/* Right col — actions + timeline */}
          <div className="md:col-span-2 space-y-4 order-1 md:order-2">
            {/* Stage CTA */}
            <StageCTA lead={lead} onAction={handleModalAction}
              isConditional={isConditional}
              onOpenConditions={() => setShowConditionsModal(true)}
              onLogOfferReceived={handleLogOfferReceived}
              onLogApplicationReceived={isTenantLead ? handleSubmitApplication : handleLogApplicationReceived} />

            {/* Reminders / Stage Follow-Ups */}
            {openReminders.length > 0 && (() => {
              const isActiveSearch = lead.stage === "Showing / Active Search";
              const now = new Date();
              return (
                <Card padding="none">
                  <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-zinc-900">
                        {"Tasks"}
                      </h2>
                      <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                        {openReminders.length}
                      </span>
                    </div>
                    {isActiveSearch && (
                      <button
                        type="button"
                        onClick={() => setActiveModal("followup")}
                        className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors"
                      >
                        + Add Task
                      </button>
                    )}
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {openReminders.map((r) => {
                      const isOverdue = new Date(r.dueDate) < now;
                      const isShowingTask = !!r.showingTask;

                      // ---- Showing task row ----
                      if (isShowingTask) {
                        const st = r.showingTask!;
                        const scheduledDisplay = new Date(st.scheduledDate).toLocaleString("en-CA", {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                        });
                        return (
                          <li
                            key={r.id}
                            className={cn(
                              "px-5 py-3.5",
                              isOverdue && isActiveSearch && "bg-red-50/40"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <span className="text-base mt-0.5 shrink-0">🏠</span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isOverdue && isActiveSearch ? "text-red-800" : "text-zinc-900"
                                    )}>
                                      {st.address}
                                    </p>
                                    {st.mlsNumber && (
                                      <span className="text-[11px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded font-mono">
                                        MLS# {st.mlsNumber}
                                      </span>
                                    )}
                                  </div>
                                  <p className={cn(
                                    "text-xs mt-0.5",
                                    isOverdue && isActiveSearch ? "text-red-500" : "text-zinc-400"
                                  )}>
                                    {isOverdue && isActiveSearch ? "Overdue · " : ""}
                                    {scheduledDisplay}
                                  </p>
                                  {st.preVisitNotes && (
                                    <p className="text-xs text-zinc-400 italic mt-0.5 line-clamp-2 break-words">
                                      {st.preVisitNotes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCompletingShowingReminder(r)}
                                className="text-xs text-zinc-400 hover:text-emerald-600 border border-zinc-200 rounded-md px-2.5 py-1 hover:border-emerald-300 transition-colors shrink-0"
                              >
                                Done
                              </button>
                            </div>
                          </li>
                        );
                      }

                      // ---- Regular reminder row ----
                      return (
                        <li
                          key={r.id}
                          className={cn(
                            "flex items-center gap-3 px-5 py-3",
                            isOverdue && isActiveSearch && "bg-red-50/40"
                          )}
                        >
                          <div className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            r.priority === "high" ? "bg-red-500" : r.priority === "medium" ? "bg-amber-400" : "bg-zinc-300"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm",
                              isOverdue && isActiveSearch ? "text-red-800 font-medium" : "text-zinc-800"
                            )}>
                              {r.title}
                            </p>
                            <p className={cn(
                              "text-xs mt-0.5",
                              isOverdue && isActiveSearch ? "text-red-500" : "text-zinc-400"
                            )}>
                              {isOverdue && isActiveSearch ? "Overdue · " : "Due "}
                              {formatDate(r.dueDate)}
                            </p>
                          </div>
                          <FollowUpBadge status={r.followUpStatus} />
                          <button
                            type="button"
                            onClick={() => handleMarkDone(r.id)}
                            className="text-xs text-zinc-400 hover:text-emerald-600 border border-zinc-200 rounded-md px-2.5 py-1 hover:border-emerald-300 transition-colors shrink-0"
                          >
                            Done
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })()}

            {/* Stage Follow-Ups "Add Task" prompt when there are no open reminders yet */}
            {openReminders.length === 0 && lead.stage === "Showing / Active Search" && (
              <Card padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Tasks</p>
                    <p className="text-xs text-zinc-400 mt-0.5">No open tasks — add one to stay on track.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal("followup")}
                    className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors shrink-0"
                  >
                    + Add Task
                  </button>
                </div>
              </Card>
            )}

            {/* Firm deal banner — persists after stage advances to Under Contract */}
            {offerFirmBanner && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">✓ All conditions cleared</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Lead automatically advanced to Under Contract.</p>
                </div>
                <button type="button" onClick={() => setOfferFirmBanner(false)}
                  className="text-emerald-500 hover:text-emerald-700 text-lg leading-none shrink-0">×</button>
              </div>
            )}

            {/* Recruit: offer panel at Offer Extended and Closed stages */}
            {isRecruitLead && (lead.stage === "Under Contract" || lead.stage === "Closed") && (
              <RecruitOfferPanel lead={lead} onJoined={() => triggerUnderContractChecklist()} />
            )}

            {/* Offer sub-system — Buyer: OfferPanel | Seller: SellerOfferPanel | Landlord: RentalApplicationsPanel | Tenant: TenantApplicationPanel */}
            {!isRecruitLead && (
              lead.stage === "Offer" ||
              lead.stage === "Under Contract" ||
              lead.stage === "Closed" ||
              (lead.stage === "Showing / Active Search" && !isTenantLead && !isSellerLead && !isLandlordLead && buyerOfferThreads.some(t => t.leadId === lead.id))
            ) && (
              isTenantLead ? (
                <TenantApplicationPanel lead={lead} onApproved={(trackingId) => triggerUnderContractChecklist(trackingId)} />
              ) : isLandlordLead ? (
                <RentalApplicationsPanel lead={lead} onApproved={() => triggerUnderContractChecklist()} />
              ) : isSellerLead ? (
                <SellerOfferPanel lead={lead} onFirm={(threadId) => {
                  setOfferFirmBanner(true);
                  triggerUnderContractChecklist(threadId);
                }} />
              ) : (
                <OfferPanel
                  lead={lead}
                  historyOnly={lead.stage === "Showing / Active Search"}
                  onFirm={(threadId) => {
                    setOfferFirmBanner(true);
                    triggerUnderContractChecklist(threadId);
                  }}
                  buyerOfferThreads={buyerOfferThreads}
                  onAddBuyerOfferThread={(thread) => {
                    // BRA check: only gate if there are no existing threads for this lead
                    const hasExistingThreads = buyerOfferThreads.some(t => t.leadId === lead.id);
                    if (!hasExistingThreads && isBuyerLead && !hasBraSigned) {
                      setActiveModal("braRequired");
                      return;
                    }
                    addBuyerOfferThread(thread);
                  }}
                  onUpdateBuyerOfferThread={updateBuyerOfferThread}
                />
              )
            )}

            {/* Seller/Landlord Showing Log — Listed/Active stage */}
            {(isSellerLead || isLandlordLead) && lead.stage === "Showing / Active Search" && (
              <SellerShowingLog
                leadId={lead.id}
                sellerShowings={sellerShowings}
                openHouses={openHouses}
                onLogShowing={() => setActiveModal("logSellerShowing")}
                onLogOpenHouse={() => setActiveModal("logOpenHouse")}
              />
            )}

            {/* Listing Agreement Panel (Seller and Landlord) — Pre-Listing and Listed/Active */}
            {(isSellerLead || isLandlordLead) && (lead.stage === "Pre-Listing" || lead.stage === "Showing / Active Search") && (
              <ListingAgreementPanel
                lead={lead}
                isLandlord={isLandlordLead}
                onSignListing={() => setActiveModal("signListing")}
                onSuspend={() => setActiveModal("suspendListing")}
                onResume={handleResumeListing}
              />
            )}

            {/* Pre-Listing Panel (Seller and Landlord) */}
            {(isSellerLead || isLandlordLead) && lead.stage === "Pre-Listing" && (
              <PreListingPanel
                lead={lead}
                checklistItems={leadPreListingItems}
                onComplete={handleCompleteChecklistItem}
                onOpenChecklistModal={() => setShowPreListingChecklistModal(true)}
              />
            )}

            {/* Lease Details card — Landlord only, shown at Lease Signed (Under Contract) and Closed */}
            {isLandlordLead && (lead.stage === "Under Contract" || lead.stage === "Closed") && (() => {
              const ld = allLeaseDetails.find((l) => l.leadId === lead.id);
              if (!ld) return null;
              const fmtD = (d: string) =>
                new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
              const fmtR = (n: number) =>
                new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
              return (
                <Card padding="none">
                  <div className="px-5 pt-4 pb-3 border-b border-zinc-100">
                    <h2 className="text-sm font-semibold text-zinc-900">Lease Details</h2>
                  </div>
                  <div className="px-5 py-4 grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-zinc-400">Monthly Rent</p><p className="text-sm font-semibold text-zinc-900 mt-0.5">{fmtR(ld.monthlyRent)}/mo</p></div>
                    <div><p className="text-xs text-zinc-400">Deposit Collected</p><p className={cn("text-sm font-medium mt-0.5", ld.depositCollected ? "text-emerald-700" : "text-amber-600")}>{ld.depositCollected ? "✓ Collected" : "Pending"}</p></div>
                    <div><p className="text-xs text-zinc-400">Lease Start</p><p className="text-sm font-medium text-zinc-800 mt-0.5">{fmtD(ld.leaseStartDate)}</p></div>
                    <div><p className="text-xs text-zinc-400">Lease End</p><p className="text-sm font-medium text-zinc-800 mt-0.5">{fmtD(ld.leaseEndDate)}</p></div>
                  </div>
                </Card>
              );
            })()}

            {/* Tenant Lease Details card — editable at Lease Signed, read-only at Closed */}
            {isTenantLead && (lead.stage === "Under Contract" || lead.stage === "Closed") && (() => {
              const tld = allTenantLeaseDetails.find((l) => l.leadId === lead.id);
              if (!tld) return null;
              const fmtD = (d?: string) => d
                ? new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                : "—";
              const fmtR = (n: number) =>
                new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
              const isEditable = lead.stage === "Under Contract";

              const handleLeaseUpdate = (patch: Partial<typeof tld>) => {
                const now = new Date().toISOString();
                updateTenantLeaseDetails(tld.id, { ...patch, updatedAt: now });
                if ("leaseStartDate" in patch) {
                  cancelRemindersBySourceId(`tenant-final-inspection-${lead.id}`);
                  const newStart = patch.leaseStartDate;
                  if (newStart) {
                    const dueDate = new Date(`${newStart}T09:00:00`);
                    dueDate.setDate(dueDate.getDate() - 1);
                    addReminder({
                      id: `r-${genId()}-finalinsp`,
                      leadId: lead.id,
                      leadName: fullName(lead),
                      title: "Final Inspection Due Tomorrow",
                      dueDate: dueDate.toISOString(),
                      createdAt: now,
                      followUpStatus: lead.followUpStatus,
                      assignedTo: lead.assignedAgent,
                      completed: false,
                      priority: "high",
                      sourceId: `tenant-final-inspection-${lead.id}`,
                    });
                    addActivity({
                      id: `act-${genId()}`,
                      leadId: lead.id,
                      type: "follow_up_created",
                      title: "Final inspection reminder created",
                      description: `Complete the final tenant inspection and key / key deposit exchange before move-in on ${new Date(`${newStart}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}.`,
                      createdAt: now,
                      createdBy: "System",
                    });
                  }
                }
              };

              return (
                <Card padding="none">
                  <div className="px-5 pt-4 pb-3 border-b border-zinc-100">
                    <h2 className="text-sm font-semibold text-zinc-900">Lease Details</h2>
                    {isEditable && <p className="text-xs text-zinc-400 mt-0.5">Fill in the lease dates to complete the tenancy record.</p>}
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-xs text-zinc-400 mb-0.5">Property</p>
                      <p className="text-sm font-medium text-zinc-900">{tld.propertyAddress}</p>
                      <p className="text-sm text-zinc-600 mt-0.5">{fmtR(tld.monthlyRent)}/mo</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Lease Start</p>
                        {isEditable ? (
                          <input type="date" value={tld.leaseStartDate ?? ""} onChange={(e) => handleLeaseUpdate({ leaseStartDate: e.target.value || undefined })}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
                        ) : (
                          <p className="text-sm font-medium text-zinc-800">{fmtD(tld.leaseStartDate)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Lease End</p>
                        {isEditable ? (
                          <input type="date" value={tld.leaseEndDate ?? ""} onChange={(e) => handleLeaseUpdate({ leaseEndDate: e.target.value || undefined })}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300" />
                        ) : (
                          <p className="text-sm font-medium text-zinc-800">{fmtD(tld.leaseEndDate)}</p>
                        )}
                      </div>
                    </div>
                    {isEditable && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={tld.depositPaid} onChange={(e) => handleLeaseUpdate({ depositPaid: e.target.checked })}
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
                        <span className="text-sm text-zinc-700">Deposit paid</span>
                      </label>
                    )}
                    {!isEditable && (
                      <div>
                        <p className="text-xs text-zinc-400">Deposit Paid</p>
                        <p className={cn("text-sm font-medium mt-0.5", tld.depositPaid ? "text-emerald-700" : "text-amber-600")}>
                          {tld.depositPaid ? "✓ Paid" : "Pending"}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* Under Contract / Lease Signed Checklist */}
            {(lead.stage === "Under Contract" || (isRecruitLead && lead.stage === "Closed")) && leadChecklistItems.length > 0 && (
              <UnderContractChecklistPanel
                title={isRecruitLead ? "Onboarding Checklist" : undefined}
                items={leadChecklistItems}
                onComplete={handleCompleteChecklistItem}
                onOpenModal={() => setShowChecklistModal(true)}
              />
            )}

            {/* Property Info card — Seller & Landlord, shown from Listed/Active onward */}
            {(isSellerLead || isLandlordLead) && leadListingDetails && (
              lead.stage === "Showing / Active Search" ||
              lead.stage === "Offer" ||
              lead.stage === "Under Contract" ||
              lead.stage === "Closed"
            ) && (
              <Card padding="none">
                <div className="px-5 pt-4 pb-3 border-b border-zinc-100">
                  <h2 className="text-sm font-semibold text-zinc-900">Property Info</h2>
                </div>
                <div className="px-5 py-4 grid grid-cols-2 gap-4">
                  {leadListingDetails.mlsNumber && (
                    <div>
                      <p className="text-xs text-zinc-400">MLS #</p>
                      <p className="text-sm font-medium text-zinc-800 mt-0.5 font-mono">{leadListingDetails.mlsNumber}</p>
                    </div>
                  )}
                  {leadListingDetails.expectedListingPrice && (
                    <div>
                      <p className="text-xs text-zinc-400">{isLandlordLead ? "Monthly Rent" : "List Price"}</p>
                      <p className="text-sm font-medium text-zinc-800 mt-0.5">
                        {new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(leadListingDetails.expectedListingPrice)}
                        {isLandlordLead ? "/mo" : ""}
                      </p>
                    </div>
                  )}
                  {leadListingDetails.actualListDate && (
                    <div>
                      <p className="text-xs text-zinc-400">Listed</p>
                      <p className="text-sm font-medium text-zinc-800 mt-0.5">
                        {new Date(`${leadListingDetails.actualListDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  )}
                  {leadListingDetails.listingAgreementExpiryDate && (
                    <div>
                      <p className="text-xs text-zinc-400">Agreement Expiry</p>
                      <p className={cn(
                        "text-sm font-medium mt-0.5",
                        isListingExpired ? "text-red-600" : "text-zinc-800"
                      )}>
                        {new Date(`${leadListingDetails.listingAgreementExpiryDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Showing Log — Buyer/Tenant only (Seller/Landlord use SellerShowingLog; Recruit has no showing log) */}
            {!isSellerLead && !isLandlordLead && !isRecruitLead && (lead.stage === "Showing / Active Search" || showings.length > 0) && (
              <ShowingLogSection
                showings={showings}
                canEdit={lead.stage === "Showing / Active Search"}
                onAdd={() => setActiveModal("addShowing")}
                onEdit={(s) => { setEditingShowing(s); setActiveModal("editShowing"); }}
                onDelete={handleDeleteShowing}
              />
            )}

            {/* Notes card */}
            <NotesCard
              activities={activities}
              onAdd={(text) => {
                const now = new Date().toISOString();
                addActivity({
                  id: `act-${genId()}`, leadId: lead.id, type: "note",
                  title: "Note added",
                  description: text,
                  createdAt: now, createdBy: currentAgent,
                });
              }}
            />

            {/* Activity timeline */}
            <Card padding="none">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
                <h2 className="text-sm font-semibold text-zinc-900">Activity Timeline</h2>
                <span className="text-xs text-zinc-400">newest first</span>
              </div>

              {activities.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-zinc-400">No activity yet.</p>
                  <p className="text-xs text-zinc-300 mt-1">Log a contact attempt to get started.</p>
                </div>
              ) : (
                <ol className="px-5 py-4">
                  {(timelineExpanded ? activities : activities.slice(0, TIMELINE_COLLAPSED_COUNT)).map((activity, idx, arr) => (
                    <li key={activity.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm shrink-0 z-10">
                          {ACTIVITY_ICONS[activity.type] ?? "•"}
                        </div>
                        {idx < arr.length - 1 && <div className="flex-1 w-px bg-zinc-200 mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-zinc-900">{activity.title}</p>
                          <span className="text-xs text-zinc-400 shrink-0">{formatDateTime(activity.createdAt)}</span>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{activity.description}</p>
                        )}
                        <p className="text-xs text-zinc-300 mt-1">{activity.createdBy}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {activities.length > TIMELINE_COLLAPSED_COUNT && (
                <div className="px-5 pb-4 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setTimelineExpanded(!timelineExpanded)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                  >
                    {timelineExpanded ? "Show less" : `Show ${activities.length - TIMELINE_COLLAPSED_COUNT} older ${activities.length - TIMELINE_COLLAPSED_COUNT === 1 ? "entry" : "entries"}`}
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === "contact" && (
        <ContactAttemptedModal lead={lead} onClose={closeModal} onSubmit={handleContactAttempt} />
      )}
      {activeModal === "discovery" && (
        <DiscoveryModal onClose={closeModal} onSubmit={handleDiscovery} isSeller={isSellerLead || isLandlordLead} isLandlord={isLandlordLead} isTenant={isTenantLead} isRecruit={isRecruitLead} lead={lead} />
      )}
      {activeModal === "activeSearch" && (
        <ActiveSearchModal lead={lead} onClose={closeModal} onSubmit={handleActiveSearch} isTenant={isTenantLead} />
      )}
      {activeModal === "braRequired" && (
        <BraRequiredModal onClose={closeModal} onLogBra={() => setActiveModal("logBra")} />
      )}
      {activeModal === "logBra" && (
        <LogBraModal onClose={closeModal} onSubmit={handleLogBra} />
      )}
      {activeModal === "offerSubmitted" && (
        <OfferSubmittedModal onClose={closeModal} onSubmit={handleOfferSubmitted} />
      )}
      {activeModal === "dealAccepted" && (
        <DealAcceptedModal onClose={closeModal} onSubmit={handleDealAccepted} isSeller={isSellerLead} />
      )}
      {activeModal === "offerLost" && (
        <OfferLostModal onClose={closeModal} onSubmit={handleOfferLost} />
      )}
      {activeModal === "offerLostNext" && (
        <Modal
          title="Offer Lost — What's Next?"
          onClose={closeModal}
          footer={
            <button type="button" onClick={closeModal}
              className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              Dismiss
            </button>
          }
        >
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-amber-800">Offer was not accepted.</p>
            <p className="text-xs text-amber-600 mt-0.5">The lead is back in active search. What would you like to do next?</p>
          </div>
          <div className="space-y-2 pt-1">
            <button type="button"
              onClick={() => handleModalAction("offerSubmitted")}
              className="w-full text-left rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition-colors">
              <p className="text-sm font-semibold text-zinc-900">Submit a new offer</p>
              <p className="text-xs text-zinc-400 mt-0.5">A property is ready — log the next offer now.</p>
            </button>
            <button type="button"
              onClick={closeModal}
              className="w-full text-left rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition-colors">
              <p className="text-sm font-semibold text-zinc-900">Continue showings first</p>
              <p className="text-xs text-zinc-400 mt-0.5">More viewings needed before the next offer.</p>
            </button>
          </div>
        </Modal>
      )}
      {activeModal === "markClosed" && (() => {
        const ao = acceptedOffers.find((o) => o.leadId === lead.id);
        return (
          <MarkClosedModal
            onClose={closeModal}
            onSubmit={handleMarkClosed}
            isLandlord={isLandlordLead || isTenantLead}
            isBuyer={lead.leadType === "Buyer"}
            isTenant={isTenantLead}
            initialClosedPrice={ao ? `$${ao.acceptedPrice.toLocaleString("en-CA")}` : undefined}
            initialClosedDate={ao?.closingDate}
          />
        );
      })()}
      {activeModal === "pauseSearch" && (
        <PauseSearchModal onClose={closeModal} onSubmit={handlePauseSearch} leadType={lead.leadType} />
      )}
      {activeModal === "suspendListing" && (
        <SuspendListingModal onClose={closeModal} onSubmit={handleSuspendListing} isLandlord={isLandlordLead} />
      )}
      {activeModal === "closedElsewhere" && (
        <ClosedElsewhereModal onClose={closeModal} onSubmit={handleClosedElsewhere} leadType={lead.leadType} />
      )}
      {activeModal === "leadLost" && (
        <LeadLostModal onClose={closeModal} onSubmit={handleLeadLost} isRecruit={isRecruitLead} />
      )}
      {activeModal === "followup" && (
        <SetFollowUpModal onClose={closeModal} onSubmit={handleSetFollowUp} />
      )}
      {activeModal === "moveBack" && (
        <MoveBackModal onClose={closeModal} onSubmit={handleMoveBack} />
      )}
      {activeModal === "scheduleShowing" && (
        <ScheduleShowingModal onClose={closeModal} onSubmit={handleScheduleShowing} />
      )}
      {activeModal === "addShowing" && (
        <ShowingModal onClose={closeModal} onSubmit={handleAddShowing} />
      )}
      {activeModal === "editShowing" && editingShowing && (
        <ShowingModal
          initial={editingShowing}
          onClose={() => { setEditingShowing(null); closeModal(); }}
          onSubmit={handleEditShowing}
        />
      )}
      {completingShowingReminder?.showingTask && (
        <CompleteShowingModal
          showingTask={completingShowingReminder.showingTask}
          onClose={() => setCompletingShowingReminder(null)}
          onSubmit={(data) => handleCompleteShowingTask(completingShowingReminder, data)}
        />
      )}
      {completingTaskReminder && (
        <CompleteTaskModal
          reminder={completingTaskReminder}
          onClose={() => setCompletingTaskReminder(null)}
          onSubmit={(notes) => handleCompleteTaskWithNote(completingTaskReminder, notes)}
        />
      )}
      {/* Seller pipeline modals */}
      {activeModal === "logSellerShowing" && (
        <LogSellerShowingModal onClose={closeModal} onSubmit={handleLogSellerShowing} />
      )}
      {activeModal === "logOpenHouse" && (
        <LogOpenHouseModal onClose={closeModal} onSubmit={handleLogOpenHouse} />
      )}
      {activeModal === "signListing" && (
        <SignListingAgreementModal onClose={closeModal} onSubmit={handleSignListing} isLandlord={isLandlordLead} initialPrice={lead.budget ?? ""} />
      )}
      {activeModal === "listOnMls" && (
        <ListOnMLSModal onClose={closeModal} onSubmit={handleListOnMLS} isLandlord={isLandlordLead} />
      )}
      {activeModal === "sellerOfferLost" && (
        <SellerOfferLostModal onClose={closeModal} onSubmit={handleSellerOfferLost} />
      )}
      {activeModal === "listingExpiredWithdrawn" && (
        <ListingExpiredWithdrawnModal
          onClose={closeModal}
          onSubmit={handleListingExpiredWithdrawn}
          lossReasons={isLandlordLead ? LANDLORD_LOSS_REASONS : SELLER_LOSS_REASONS}
        />
      )}
      {activeModal === "landlordLost" && (
        <LandlordLostModal onClose={closeModal} onSubmit={handleLandlordLost} />
      )}
      {activeModal === "tenantLost" && (
        <LandlordLostModal onClose={closeModal} onSubmit={handleTenantLost} />
      )}
      {/* Recruit pipeline modals */}
      {activeModal === "recruitMeeting" && (
        <RecruitMeetingModal onClose={closeModal} onSubmit={handleRecruitConversation} />
      )}
      {activeModal === "recruitExtendOffer" && (
        <RecruitExtendOfferModal onClose={closeModal} onSubmit={handleRecruitExtendOffer} />
      )}
      {showPreListingChecklistModal && leadPreListingItems.length > 0 && (
        <UnderContractChecklistModal
          title="Pre-Listing — Action Checklist"
          items={leadPreListingItems}
          onComplete={handleCompleteChecklistItem}
          onRemind={handleRemindChecklistItem}
          onClose={() => setShowPreListingChecklistModal(false)}
          onSaveInclusionsExclusions={(inclusions, exclusions) => {
            const now = new Date().toISOString();
            const ld = allListingDetails.find((d) => d.leadId === lead.id);
            if (ld) updateListingDetails(ld.id, { inclusionsNotes: inclusions || undefined, exclusionsNotes: exclusions || undefined, updatedAt: now });
            const noteText = [inclusions && `Inclusions: ${inclusions}`, exclusions && `Exclusions: ${exclusions}`].filter(Boolean).join(" | ");
            if (noteText) addNoteIfPresent(noteText, now, "Pre-Listing Checklist");
          }}
        />
      )}

      {showConditionsModal && leadConditions.length > 0 && (
        <PendingConditionsModal
          conditions={leadConditions}
          onResolve={handleResolveCondition}
          onClose={() => setShowConditionsModal(false)}
        />
      )}
      {conditionsToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 whitespace-nowrap">
          <span>✓</span>
          <span>All conditions cleared — moved to Under Contract</span>
        </div>
      )}
      {showChecklistModal && leadChecklistItems.length > 0 && (
        <UnderContractChecklistModal
          title={isRecruitLead ? "Onboarding Checklist" : undefined}
          items={leadChecklistItems}
          onComplete={handleCompleteChecklistItem}
          onRemind={handleRemindChecklistItem}
          onClose={() => setShowChecklistModal(false)}
        />
      )}
    </>
  );
}
