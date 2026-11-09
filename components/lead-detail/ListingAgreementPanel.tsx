"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { cn, genId, fullName } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useRole, AGENT_NAME, MANAGER_NAME } from "@/lib/role-context";
import type { Lead, ListingDetails } from "@/lib/types";
import { SELLER_LOSS_REASONS, LANDLORD_LOSS_REASONS } from "@/lib/constants";

// ---- Status display helpers ----

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  suspended: "Suspended",
  expired: "Expired",
  extended: "Extended",
  terminated: "Terminated",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
  extended: "bg-sky-100 text-sky-700",
  terminated: "bg-zinc-100 text-zinc-500",
};

const SELLER_TERMINATE_REASONS = [
  "Listing expired",
  "Client changed their mind",
  "Priced too high",
  "Property taken off market",
  "Switched to another agent",
  "Personal circumstances",
  "Other",
];

const LANDLORD_TERMINATE_REASONS = [
  "Tenant decided to renew",
  "Landlord changed their mind",
  "Unit taken off market",
  "Switched to another agent",
  "Personal circumstances",
  "Other",
];

// ---- Inclusions & Exclusions collapsible row ----

function InclusionsExclusionsRow({ inclusions, exclusions }: { inclusions?: string; exclusions?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-zinc-100 px-5 py-3">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left group">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Inclusions &amp; Exclusions</p>
        <span className="text-zinc-300 group-hover:text-zinc-500 transition-colors text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {inclusions && (
            <div>
              <p className="text-xs text-zinc-400">Incl.</p>
              <p className="text-sm text-zinc-700 mt-0.5">{inclusions}</p>
            </div>
          )}
          {exclusions && (
            <div>
              <p className="text-xs text-zinc-400">Excl.</p>
              <p className="text-sm text-zinc-700 mt-0.5">{exclusions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- EditListingModal ----

interface EditListingData {
  mlsNumber: string;
  listPrice: string;
  actualListDate: string;
  expiryDate: string;
  commission: string;
  notes: string;
}

function EditListingModal({ ld, isLandlord, onClose, onSubmit }: {
  ld: ListingDetails;
  isLandlord: boolean;
  onClose: () => void;
  onSubmit: (data: EditListingData) => void;
}) {
  const [mlsNumber, setMlsNumber] = useState(ld.mlsNumber ?? "");
  const [listPrice, setListPrice] = useState(ld.expectedListingPrice ? String(ld.expectedListingPrice) : "");
  const [actualListDate, setActualListDate] = useState(ld.actualListDate ?? "");
  const [expiryDate, setExpiryDate] = useState(ld.listingAgreementExpiryDate ?? "");
  const [commission, setCommission] = useState(ld.commission ?? "");
  const [notes, setNotes] = useState("");

  const canSubmit = expiryDate.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">Edit Listing Agreement</h2>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-600">MLS Number</label>
              <input className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm" value={mlsNumber} onChange={e => setMlsNumber(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Commission</label>
              <input className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm" value={commission} onChange={e => setCommission(e.target.value)} placeholder="e.g. 4%" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">{isLandlord ? "Expected Monthly Rent" : "Expected List Price"}</label>
              <input className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm" value={listPrice} onChange={e => setListPrice(e.target.value)} placeholder={isLandlord ? "e.g. 2800" : "e.g. 950000"} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Actual List Date</label>
              <input type="date" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm" value={actualListDate} onChange={e => setActualListDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Agreement Expiry Date <span className="text-red-500">*</span></label>
            <input type="date" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Notes (optional)</label>
            <textarea rows={2} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl px-4 py-2 hover:bg-zinc-50 transition-colors">Cancel</button>
          <button type="button" disabled={!canSubmit} onClick={() => onSubmit({ mlsNumber, listPrice, actualListDate, expiryDate, commission, notes })}
            className={cn("text-sm font-medium rounded-xl px-4 py-2 transition-colors", canSubmit ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400 cursor-not-allowed")}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- ExtendListingModal ----

interface ExtendListingData {
  newExpiryDate: string;
  commission: string;
  notes: string;
}

function ExtendListingModal({ currentExpiry, onClose, onSubmit }: {
  currentExpiry?: string;
  onClose: () => void;
  onSubmit: (data: ExtendListingData) => void;
}) {
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [commission, setCommission] = useState("");
  const [notes, setNotes] = useState("");

  const expiryDateInvalid = !!(newExpiryDate && currentExpiry && newExpiryDate <= currentExpiry);
  const canSubmit = newExpiryDate.length > 0 && !expiryDateInvalid;

  const fmtD = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">Extend Listing Agreement</h2>
          {currentExpiry && (
            <p className="text-xs text-zinc-500 mt-1">Current expiry: {fmtD(currentExpiry)}</p>
          )}
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-600">New Expiry Date <span className="text-red-500">*</span></label>
            <input type="date" min={currentExpiry} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm" value={newExpiryDate} onChange={e => setNewExpiryDate(e.target.value)} />
            {expiryDateInvalid && (
              <p className="text-xs text-red-500 mt-1">Must be after the current expiry date</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Updated Commission (optional)</label>
            <input className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm" value={commission} onChange={e => setCommission(e.target.value)} placeholder="Leave blank to keep current" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Notes (optional)</label>
            <textarea rows={2} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Client requested extension before relisting" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl px-4 py-2 hover:bg-zinc-50 transition-colors">Cancel</button>
          <button type="button" disabled={!canSubmit} onClick={() => onSubmit({ newExpiryDate, commission, notes })}
            className={cn("text-sm font-medium rounded-xl px-4 py-2 transition-colors", canSubmit ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400 cursor-not-allowed")}>
            Extend Agreement
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- TerminateListingModal (2-step) ----

interface TerminateListingData {
  terminationDate: string;
  reason: string;
  notes: string;
  outcome: "nurture" | "inactive";
  lossReason?: string;
}

function TerminateListingModal({ isLandlord, onClose, onSubmit }: {
  isLandlord: boolean;
  onClose: () => void;
  onSubmit: (data: TerminateListingData) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<"nurture" | "inactive" | null>(null);
  const [lossReason, setLossReason] = useState("");

  const terminateReasons = isLandlord ? LANDLORD_TERMINATE_REASONS : SELLER_TERMINATE_REASONS;
  const lossReasons = isLandlord ? LANDLORD_LOSS_REASONS : SELLER_LOSS_REASONS;

  const step1Valid = terminationDate.length > 0 && reason.length > 0;
  const step2Valid = outcome !== null && (outcome === "nurture" || (outcome === "inactive" && lossReason.length > 0));

  const fmtD = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">Terminate Listing Agreement</h2>
          <div className="flex gap-1 mt-2.5">
            {([1, 2] as const).map(s => (
              <div key={s} className={cn("h-1 flex-1 rounded-full transition-colors", s <= step ? "bg-zinc-900" : "bg-zinc-200")} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-600">Termination Date <span className="text-red-500">*</span></label>
              <input type="date" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm" value={terminationDate} onChange={e => setTerminationDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Reason <span className="text-red-500">*</span></label>
              <select className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white" value={reason} onChange={e => setReason(e.target.value)}>
                <option value="">Select reason...</option>
                {terminateReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Notes (optional)</label>
              <textarea rows={2} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-zinc-600">
              Listing terminated on <span className="font-medium">{fmtD(terminationDate)}</span> — {reason}. What happens to the client relationship?
            </p>
            <div className="space-y-2">
              <button type="button" onClick={() => setOutcome("nurture")}
                className={cn("w-full text-left rounded-xl border px-4 py-3 transition-colors", outcome === "nurture" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-300 text-zinc-800")}>
                <p className="text-sm font-medium">Not Now — Keep in Nurture</p>
                <p className={cn("text-xs mt-0.5", outcome === "nurture" ? "text-zinc-300" : "text-zinc-400")}>Stay in pipeline. 6-month and 1-year follow-up reminders created.</p>
              </button>
              <button type="button" onClick={() => setOutcome("inactive")}
                className={cn("w-full text-left rounded-xl border px-4 py-3 transition-colors", outcome === "inactive" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-300 text-zinc-800")}>
                <p className="text-sm font-medium">Inactive — End Relationship</p>
                <p className={cn("text-xs mt-0.5", outcome === "inactive" ? "text-zinc-300" : "text-zinc-400")}>Move lead to Lost. No further follow-up.</p>
              </button>
            </div>
            {outcome === "inactive" && (
              <div>
                <label className="text-xs font-medium text-zinc-600">Loss Reason <span className="text-red-500">*</span></label>
                <select className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white" value={lossReason} onChange={e => setLossReason(e.target.value)}>
                  <option value="">Select reason...</option>
                  {lossReasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-zinc-100 flex justify-between gap-3">
          {step === 1 ? (
            <>
              <button type="button" onClick={onClose} className="text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl px-4 py-2 hover:bg-zinc-50 transition-colors">Cancel</button>
              <button type="button" disabled={!step1Valid} onClick={() => setStep(2)}
                className={cn("text-sm font-medium rounded-xl px-4 py-2 transition-colors", step1Valid ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400 cursor-not-allowed")}>
                Next →
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl px-4 py-2 hover:bg-zinc-50 transition-colors">← Back</button>
              <button type="button" disabled={!step2Valid}
                onClick={() => {
                  if (!step2Valid || !outcome) return;
                  onSubmit({ terminationDate, reason, notes, outcome, lossReason: outcome === "inactive" ? lossReason : undefined });
                }}
                className={cn("text-sm font-medium rounded-xl px-4 py-2 transition-colors", step2Valid ? "bg-red-600 text-white hover:bg-red-700" : "bg-zinc-100 text-zinc-400 cursor-not-allowed")}>
                Terminate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main ListingAgreementPanel ----

interface ListingAgreementPanelProps {
  lead: Lead;
  isLandlord: boolean;
  onSignListing: () => void;
  onSuspend: () => void;
  onResume: () => void;
}

export function ListingAgreementPanel({ lead, isLandlord, onSignListing, onSuspend, onResume }: ListingAgreementPanelProps) {
  const { role } = useRole();
  const currentAgent = role === "manager" ? MANAGER_NAME : AGENT_NAME;

  const {
    listingDetails,
    updateListingDetails,
    updateLead,
    addActivity,
    addReminder,
    cancelRemindersBySourceId,
  } = useStore();

  const ld = listingDetails.find((l: ListingDetails) => l.leadId === lead.id);

  const isExpiredByDate = !!(
    ld?.listingAgreementExpiryDate &&
    new Date(`${ld.listingAgreementExpiryDate}T23:59:59`) < new Date() &&
    (ld.listingStatus === "active" || ld.listingStatus === "extended") &&
    lead.stage !== "Closed" &&
    lead.stage !== "Lost"
  );

  useEffect(() => {
    if (isExpiredByDate && ld) {
      updateListingDetails(ld.id, { listingStatus: "expired", updatedAt: new Date().toISOString() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpiredByDate, ld?.id]);

  const effectiveStatus = isExpiredByDate ? "expired" : (ld?.listingStatus ?? "draft");

  const [openModal, setOpenModal] = useState<"edit" | "extend" | "terminate" | null>(null);

  const fmtD = (d?: string) => d
    ? new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  const fmtP = (n?: number) => n
    ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n)
    : "—";

  const nowIso = () => new Date().toISOString();

  const recreateExpiryReminders = (expiryDate: string, n: string) => {
    cancelRemindersBySourceId(`listing-exp-${lead.id}`);
    const expiryMs = new Date(`${expiryDate}T09:00:00`).getTime();
    if (expiryMs - Date.now() > 7 * 86_400_000) {
      addReminder({
        id: `r-${genId()}-exp7`, leadId: lead.id, leadName: fullName(lead),
        title: `Listing agreement expires in 7 days — ${lead.firstName} ${lead.lastName}`,
        dueDate: new Date(expiryMs - 7 * 86_400_000).toISOString(), createdAt: n,
        followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: "medium", sourceId: `listing-exp-${lead.id}`,
      });
    }
    addReminder({
      id: `r-${genId()}-exp0`, leadId: lead.id, leadName: fullName(lead),
      title: `Listing agreement expires today — ${lead.firstName} ${lead.lastName}`,
      dueDate: new Date(`${expiryDate}T09:00:00`).toISOString(), createdAt: n,
      followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
      completed: false, priority: "high", sourceId: `listing-exp-${lead.id}`,
    });
  };

  const handleEdit = (data: { mlsNumber: string; listPrice: string; actualListDate: string; expiryDate: string; commission: string; notes: string }) => {
    if (!ld) return;
    const n = nowIso();
    const prevExpiry = ld.listingAgreementExpiryDate;
    const parsedPrice = data.listPrice ? parseFloat(data.listPrice.replace(/[^0-9.]/g, "")) || undefined : undefined;

    updateListingDetails(ld.id, {
      mlsNumber: data.mlsNumber || undefined,
      expectedListingPrice: parsedPrice,
      actualListDate: data.actualListDate || undefined,
      listingAgreementExpiryDate: data.expiryDate || undefined,
      commission: data.commission || undefined,
      updatedAt: n,
    });

    if (data.expiryDate && data.expiryDate !== prevExpiry) {
      recreateExpiryReminders(data.expiryDate, n);
    }

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "note",
      title: "Listing agreement details updated",
      description: data.notes || "Agent updated listing agreement fields.",
      createdAt: n, createdBy: currentAgent,
    });
    setOpenModal(null);
  };

  const handleExtend = (data: ExtendListingData) => {
    if (!ld) return;
    const n = nowIso();
    recreateExpiryReminders(data.newExpiryDate, n);

    updateListingDetails(ld.id, {
      listingAgreementExpiryDate: data.newExpiryDate,
      listingStatus: "extended",
      extensionCount: (ld.extensionCount ?? 0) + 1,
      ...(data.commission ? { commission: data.commission } : {}),
      updatedAt: n,
    });

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "note",
      title: `Listing agreement extended to ${fmtD(data.newExpiryDate)}`,
      description: data.notes || `New expiry: ${fmtD(data.newExpiryDate)}.`,
      createdAt: n, createdBy: currentAgent,
    });
    setOpenModal(null);
  };

  const handleTerminate = (data: TerminateListingData) => {
    if (!ld) return;
    const n = nowIso();

    cancelRemindersBySourceId(`listing-exp-${lead.id}`);
    cancelRemindersBySourceId(`listing-suspension-${lead.id}`);

    updateListingDetails(ld.id, {
      listingStatus: "terminated",
      terminationDate: data.terminationDate,
      terminationReason: data.reason,
      updatedAt: n,
    });

    if (data.outcome === "nurture") {
      const sixMo = new Date();
      sixMo.setMonth(sixMo.getMonth() + 6);
      const oneYr = new Date();
      oneYr.setFullYear(oneYr.getFullYear() + 1);

      addReminder({
        id: `r-${genId()}`, leadId: lead.id, leadName: fullName(lead),
        title: `6-month nurture check-in — ${lead.firstName} ${lead.lastName}`,
        dueDate: sixMo.toISOString(), createdAt: n,
        followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: "medium", sourceId: `nurture-${lead.id}`,
      });
      addReminder({
        id: `r-${genId()}`, leadId: lead.id, leadName: fullName(lead),
        title: `1-year nurture check-in — ${lead.firstName} ${lead.lastName}`,
        dueDate: oneYr.toISOString(), createdAt: n,
        followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: "low", sourceId: `nurture-${lead.id}`,
      });

      addActivity({
        id: `act-${genId()}`, leadId: lead.id, type: "note",
        title: `Listing terminated on ${fmtD(data.terminationDate)} — staying in nurture`,
        description: data.notes || `Reason: ${data.reason}. Client kept in nurture pipeline.`,
        createdAt: n, createdBy: currentAgent,
      });
    } else {
      updateLead(lead.id, { stage: "Lost", lossReason: data.lossReason, updatedAt: n });
      addActivity({
        id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
        title: `Listing terminated on ${fmtD(data.terminationDate)} — marked as Lost`,
        description: data.notes || `Reason: ${data.reason}. Client relationship ended.`,
        createdAt: n, createdBy: currentAgent,
      });
    }
    setOpenModal(null);
  };

  const isSuspended = lead.followUpStatus === "Paused" && !!(lead.listingSuspensionEndDate || lead.listingSuspensionReason);

  // Empty state
  if (!ld) {
    return (
      <Card padding="none">
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Listing Agreement</h2>
            <p className="text-xs text-zinc-400 mt-0.5">No listing agreement on file</p>
          </div>
          <button type="button" onClick={onSignListing}
            className="text-sm font-medium text-zinc-900 border border-zinc-200 rounded-xl px-3 py-1.5 hover:bg-zinc-50 transition-colors whitespace-nowrap">
            Sign Agreement
          </button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card padding="none">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-zinc-900">Listing Agreement</h2>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_STYLE[effectiveStatus])}>
                {STATUS_LABEL[effectiveStatus]}
              </span>
              {(ld.extensionCount ?? 0) > 0 && (
                <span className="text-xs text-zinc-400">({ld.extensionCount} extension{ld.extensionCount !== 1 ? "s" : ""})</span>
              )}
            </div>
          </div>
          {/* Action buttons — driven by effective status */}
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {(effectiveStatus === "active" || effectiveStatus === "extended") && (
              <>
                <button type="button" onClick={() => setOpenModal("edit")} className="text-xs font-medium text-zinc-700 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">Edit</button>
                {isSuspended ? (
                  <button type="button" onClick={onResume} className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 transition-colors">▶ Resume</button>
                ) : (
                  <button type="button" onClick={onSuspend} className="text-xs font-medium text-amber-700 border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-50 transition-colors">⏸ Suspend</button>
                )}
                <button type="button" onClick={() => setOpenModal("terminate")} className="text-xs font-medium text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors">Terminate</button>
              </>
            )}
            {effectiveStatus === "suspended" && (
              <>
                <button type="button" onClick={onResume} className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 transition-colors">▶ Resume</button>
                <button type="button" onClick={() => setOpenModal("edit")} className="text-xs font-medium text-zinc-700 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">Edit</button>
                <button type="button" onClick={() => setOpenModal("terminate")} className="text-xs font-medium text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors">Terminate</button>
              </>
            )}
            {effectiveStatus === "expired" && (
              <>
                <button type="button" onClick={() => setOpenModal("extend")} className="text-xs font-medium text-sky-700 border border-sky-200 rounded-lg px-2.5 py-1.5 hover:bg-sky-50 transition-colors">Extend</button>
                <button type="button" onClick={() => setOpenModal("terminate")} className="text-xs font-medium text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 transition-colors">Terminate</button>
              </>
            )}
          </div>
        </div>

        {/* Key fields grid */}
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3">
          {ld.listingAgreementSignedDate && (
            <div>
              <p className="text-xs text-zinc-400">Agreement Signed</p>
              <p className="text-sm font-medium text-zinc-800 mt-0.5">{fmtD(ld.listingAgreementSignedDate)}</p>
            </div>
          )}
          {ld.listingAgreementExpiryDate && (
            <div>
              <p className="text-xs text-zinc-400">Agreement Expiry</p>
              <p className={cn("text-sm font-medium mt-0.5", effectiveStatus === "expired" ? "text-red-600" : "text-zinc-800")}>
                {fmtD(ld.listingAgreementExpiryDate)}
              </p>
            </div>
          )}
          {ld.expectedListingPrice && (
            <div>
              <p className="text-xs text-zinc-400">{isLandlord ? "Expected Monthly Rent" : "Expected List Price"}</p>
              <p className="text-sm font-medium text-zinc-800 mt-0.5">
                {isLandlord ? `${fmtP(ld.expectedListingPrice)}/mo` : fmtP(ld.expectedListingPrice)}
              </p>
            </div>
          )}
          {ld.commission && (
            <div>
              <p className="text-xs text-zinc-400">Commission</p>
              <p className="text-sm font-medium text-zinc-800 mt-0.5">{ld.commission}</p>
            </div>
          )}
          {ld.mlsNumber && (
            <div>
              <p className="text-xs text-zinc-400">MLS #</p>
              <p className="text-sm font-medium text-zinc-800 mt-0.5">{ld.mlsNumber}</p>
            </div>
          )}
          {ld.actualListDate && (
            <div>
              <p className="text-xs text-zinc-400">Listed on MLS</p>
              <p className="text-sm font-medium text-zinc-800 mt-0.5">{fmtD(ld.actualListDate)}</p>
            </div>
          )}
          {effectiveStatus === "terminated" && ld.terminationDate && (
            <div>
              <p className="text-xs text-zinc-400">Terminated</p>
              <p className="text-sm font-medium text-zinc-800 mt-0.5">{fmtD(ld.terminationDate)}</p>
            </div>
          )}
          {effectiveStatus === "terminated" && ld.terminationReason && (
            <div>
              <p className="text-xs text-zinc-400">Reason</p>
              <p className="text-sm font-medium text-zinc-800 mt-0.5">{ld.terminationReason}</p>
            </div>
          )}
        </div>

        {/* Inclusions & Exclusions — shown when documented via pre-listing checklist */}
        {(ld.inclusionsNotes || ld.exclusionsNotes) && (
          <InclusionsExclusionsRow inclusions={ld.inclusionsNotes} exclusions={ld.exclusionsNotes} />
        )}
      </Card>

      {openModal === "edit" && ld && (
        <EditListingModal ld={ld} isLandlord={isLandlord} onClose={() => setOpenModal(null)} onSubmit={handleEdit} />
      )}
      {openModal === "extend" && (
        <ExtendListingModal currentExpiry={ld.listingAgreementExpiryDate} onClose={() => setOpenModal(null)} onSubmit={handleExtend} />
      )}
      {openModal === "terminate" && (
        <TerminateListingModal isLandlord={isLandlord} onClose={() => setOpenModal(null)} onSubmit={handleTerminate} />
      )}
    </>
  );
}
