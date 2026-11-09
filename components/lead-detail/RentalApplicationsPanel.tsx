"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn, genId } from "@/lib/utils";
import { fullName } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useRole, AGENT_NAME, MANAGER_NAME } from "@/lib/role-context";
import type { Lead, RentalApplication, RentalApplicationStatus, CreditCheckStatus } from "@/lib/types";
import { CoopAgentRow, CoopAgentSection, EditCoopAgentModal } from "./CoopAgentRow";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const parsePriceInput = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

const STATUS_STYLES: Record<RentalApplicationStatus, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-blue-100 text-blue-800" },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-800" },
  rejected:  { label: "Rejected",  cls: "bg-red-100 text-red-700" },
  withdrawn: { label: "Withdrawn", cls: "bg-zinc-100 text-zinc-500" },
};

const CREDIT_STYLES: Record<CreditCheckStatus, { label: string; cls: string }> = {
  not_started: { label: "Not Started", cls: "bg-zinc-100 text-zinc-500" },
  pending:     { label: "Pending",     cls: "bg-amber-100 text-amber-700" },
  passed:      { label: "Passed",      cls: "bg-emerald-100 text-emerald-700" },
  failed:      { label: "Failed",      cls: "bg-red-100 text-red-600" },
};

const STATUS_ORDER: Record<RentalApplicationStatus, number> = {
  approved: 0, pending: 1, rejected: 2, withdrawn: 3,
};

const CREDIT_QUALITY: Record<CreditCheckStatus, number> = {
  passed:      0,
  pending:     1,
  not_started: 2,
  failed:      3,
};

function sortApplications(apps: RentalApplication[]): RentalApplication[] {
  return [...apps].sort((a, b) => {
    // Status first: approved → pending → rejected → withdrawn
    const sDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (sDiff !== 0) return sDiff;
    // Within same status: better credit quality first (passed → pending → not_started → failed)
    const cDiff = CREDIT_QUALITY[a.creditCheckStatus] - CREDIT_QUALITY[b.creditCheckStatus];
    if (cDiff !== 0) return cDiff;
    // Same status + same credit quality: highest income first
    return (b.offerPrice ?? 0) - (a.offerPrice ?? 0);
  });
}

// ── Shared modal UI ───────────────────────────────────────────────────────────

const fi = "w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition border-zinc-200 focus:ring-zinc-300";
const fl = "text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1.5";

function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-5 md:pt-5 border-b border-zinc-100 shrink-0">
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none w-7 h-7 flex items-center justify-center">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4 md:px-5">{children}</div>
        <div className="flex flex-col-reverse gap-2 px-4 py-3 border-t border-zinc-100 shrink-0 md:flex-row md:gap-3 md:px-5">{footer}</div>
      </div>
    </div>
  );
}

function CancelBtn({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose}
      className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
      Cancel
    </button>
  );
}

function SubmitBtn({ label, disabled, onClick, variant = "dark" }: {
  label: string; disabled: boolean; onClick: () => void; variant?: "dark" | "emerald";
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={cn(
        "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors",
        disabled ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          : variant === "emerald" ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : "bg-zinc-900 text-white hover:bg-zinc-800"
      )}>
      {label}
    </button>
  );
}

// ── Log Application Modal ─────────────────────────────────────────────────────

interface LogApplicationData {
  applicantLabel: string;
  monthlyIncome: string;
  creditCheckStatus: CreditCheckStatus;
  referencesChecked: boolean;
  notes: string;
  coopAgentFirstName?: string;
  coopAgentLastName?: string;
  coopAgentMobile?: string;
  coopAgentBrokerage?: string;
}

function LogApplicationModal({ appNumber, onClose, onSubmit }: {
  appNumber: number; onClose: () => void; onSubmit: (data: LogApplicationData) => void;
}) {
  const [applicantLabel, setApplicantLabel] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [creditCheckStatus, setCreditCheckStatus] = useState<CreditCheckStatus>("not_started");
  const [referencesChecked, setReferencesChecked] = useState(false);
  const [notes, setNotes] = useState("");
  const [coopFirst, setCoopFirst]       = useState("");
  const [coopLast, setCoopLast]         = useState("");
  const [coopMobile, setCoopMobile]     = useState("");
  const [coopBrokerage, setCoopBrokerage] = useState("");

  return (
    <Modal title={`Log Application — #${appNumber}`} onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Log Application" disabled={false} onClick={() => onSubmit({ applicantLabel, monthlyIncome, creditCheckStatus, referencesChecked, notes, coopAgentFirstName: coopFirst || undefined, coopAgentLastName: coopLast || undefined, coopAgentMobile: coopMobile || undefined, coopAgentBrokerage: coopBrokerage || undefined })} /></>}>
      <div>
        <label className={fl}>Applicant Name <span className="normal-case text-zinc-400 font-normal">(optional — e.g. &quot;John &amp; Maria Smith&quot;)</span></label>
        <input type="text" value={applicantLabel} onChange={(e) => setApplicantLabel(e.target.value)}
          placeholder={`Applicant ${appNumber}`} className={fi} autoFocus />
      </div>
      <div>
        <label className={fl}>Offer Price <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)}
          placeholder="e.g. 2800" className={fi} />
      </div>
      <div>
        <label className={fl}>Credit Check Status</label>
        <select value={creditCheckStatus} onChange={(e) => setCreditCheckStatus(e.target.value as CreditCheckStatus)}
          className={cn(fi, "appearance-none")}>
          <option value="not_started">Not Started</option>
          <option value="pending">Pending</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={referencesChecked} onChange={(e) => setReferencesChecked(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
        <span className="text-sm text-zinc-700">References checked</span>
      </label>
      <div>
        <label className={fl}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Income verification, employment details, any concerns…"
          className={cn(fi, "resize-none")} />
      </div>
      <CoopAgentSection
        label="Tenant's Agent"
        firstName={coopFirst} setFirstName={setCoopFirst}
        lastName={coopLast}   setLastName={setCoopLast}
        mobile={coopMobile}   setMobile={setCoopMobile}
        brokerage={coopBrokerage} setBrokerage={setCoopBrokerage}
      />
    </Modal>
  );
}

// ── Confirm Lease Modal ───────────────────────────────────────────────────────

interface ConfirmLeaseData {
  monthlyRent: string;
  leaseStartDate: string;
  leaseEndDate: string;
  depositCollected: boolean;
}

function ConfirmLeaseModal({ app, prefillRent, onClose, onSubmit }: {
  app: RentalApplication;
  prefillRent?: number;
  onClose: () => void;
  onSubmit: (data: ConfirmLeaseData) => void;
}) {
  const [monthlyRent, setMonthlyRent] = useState(prefillRent ? String(prefillRent) : "");
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [depositCollected, setDepositCollected] = useState(false);
  const label = app.applicantLabel || "Applicant";
  const canSubmit = monthlyRent.trim().length > 0 && parsePriceInput(monthlyRent) > 0 && leaseStartDate.length > 0 && leaseEndDate.length > 0;

  return (
    <Modal title={`Approve Application — ${label}`} onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Approve & Sign Lease" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ monthlyRent, leaseStartDate, leaseEndDate, depositCollected }); }} variant="emerald" /></>}>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-emerald-800">Approving {label}&apos;s application.</p>
        <p className="text-xs text-emerald-600 mt-0.5">All other pending applications will be rejected. Lead moves to Lease Signed.</p>
      </div>
      <div>
        <label className={fl}>Monthly Rent <span className="text-red-400">*</span></label>
        <input type="text" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)}
          placeholder="e.g. 2800" className={fi} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>Lease Start Date <span className="text-red-400">*</span></label>
          <input type="date" value={leaseStartDate} onChange={(e) => setLeaseStartDate(e.target.value)} className={fi} />
        </div>
        <div>
          <label className={fl}>Lease End Date <span className="text-red-400">*</span></label>
          <input type="date" value={leaseEndDate} onChange={(e) => setLeaseEndDate(e.target.value)} className={fi} />
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={depositCollected} onChange={(e) => setDepositCollected(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
        <span className="text-sm text-zinc-700">Deposit collected</span>
      </label>
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will</p>
        <p className="text-xs text-zinc-400">· Approve {label}&apos;s application</p>
        <p className="text-xs text-zinc-400">· Reject all other pending applications</p>
        <p className="text-xs text-zinc-400">· Create lease record and move lead to Lease Signed</p>
      </div>
    </Modal>
  );
}

// ── Main RentalApplicationsPanel ─────────────────────────────────────────────

export function RentalApplicationsPanel({ lead, onApproved }: { lead: Lead; onApproved: () => void }) {
  const {
    rentalApplications, addRentalApplication, updateRentalApplication,
    addLeaseDetails,
    listingDetails: allListingDetails,
    addActivity, addReminder, cancelRemindersBySourceId, updateLead,
  } = useStore();
  const { role } = useRole();
  const currentAgent = role === "agent" ? AGENT_NAME : MANAGER_NAME;

  const applications = sortApplications(
    rentalApplications.filter((a) => a.leadId === lead.id)
  );

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const approvedApp = applications.find((a) => a.status === "approved");
  const prefillRent = allListingDetails.find((ld) => ld.leadId === lead.id)?.expectedListingPrice;
  const nextAppNumber = applications.length + 1;

  // Auto-open the log form the first time this panel appears (no applications yet)
  const [showLogApp, setShowLogApp] = useState(() => applications.length === 0);
  const [approvingApp, setApprovingApp] = useState<RentalApplication | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editCoopApp, setEditCoopApp] = useState<RentalApplication | null>(null);

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLogApplication = (data: LogApplicationData) => {
    const now = new Date().toISOString();
    const label = data.applicantLabel.trim() || `Applicant ${nextAppNumber}`;
    const app: RentalApplication = {
      id: `ra-${genId()}`, leadId: lead.id, applicantLabel: label,
      status: "pending",
      offerPrice: data.monthlyIncome ? parsePriceInput(data.monthlyIncome) : undefined,
      creditCheckStatus: data.creditCheckStatus,
      referencesChecked: data.referencesChecked,
      notes: data.notes.trim() || undefined,
      ...(data.coopAgentFirstName && { coopAgentFirstName: data.coopAgentFirstName }),
      ...(data.coopAgentLastName  && { coopAgentLastName:  data.coopAgentLastName }),
      ...(data.coopAgentMobile    && { coopAgentMobile:    data.coopAgentMobile }),
      ...(data.coopAgentBrokerage && { coopAgentBrokerage: data.coopAgentBrokerage }),
      createdBy: currentAgent, createdAt: now, updatedAt: now,
    };
    addRentalApplication(app);
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Application received — ${label}`,
      description: [
        data.monthlyIncome && `Offer price: ${fmtPrice(parsePriceInput(data.monthlyIncome ?? ""))}/mo`,
        `Credit check: ${CREDIT_STYLES[data.creditCheckStatus].label}`,
        data.referencesChecked && "References checked",
        data.notes.trim(),
      ].filter(Boolean).join(". "),
      createdAt: now, createdBy: currentAgent,
    });
    setShowLogApp(false);
  };

  const handleApprove = (app: RentalApplication, data: ConfirmLeaseData) => {
    const now = new Date().toISOString();
    const rent = parsePriceInput(data.monthlyRent);
    const label = app.applicantLabel || "Applicant";

    // Approve this application
    updateRentalApplication(app.id, { status: "approved", updatedAt: now });

    // Reject all other pending
    applications
      .filter((a) => a.id !== app.id && a.status === "pending")
      .forEach((a) => updateRentalApplication(a.id, { status: "rejected", updatedAt: now }));

    // Create lease details
    addLeaseDetails({
      id: `ld-${genId()}`, leadId: lead.id, rentalApplicationId: app.id,
      monthlyRent: rent, leaseStartDate: data.leaseStartDate, leaseEndDate: data.leaseEndDate,
      depositCollected: data.depositCollected,
      createdBy: currentAgent, createdAt: now, updatedAt: now,
    });

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Application approved — ${label}`,
      description: [
        `Rent: ${fmtPrice(rent)}/mo`,
        `Lease: ${new Date(`${data.leaseStartDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })} – ${new Date(`${data.leaseEndDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`,
        data.depositCollected && "Deposit collected",
      ].filter(Boolean).join(". "),
      createdAt: now, createdBy: currentAgent,
    });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
      title: "Lease signed — moved to Lease Signed",
      description: "Tenant application approved and lease details confirmed.",
      createdAt: now, createdBy: currentAgent,
    });

    updateLead(lead.id, { stage: "Under Contract", updatedAt: now });

    // Final inspection reminder — 1 day before lease start
    if (data.leaseStartDate) {
      cancelRemindersBySourceId(`landlord-final-inspection-${lead.id}`);
      const dueDate = new Date(`${data.leaseStartDate}T09:00:00`);
      dueDate.setDate(dueDate.getDate() - 1);
      addReminder({
        id: `r-${genId()}-finalinsp`,
        leadId: lead.id, leadName: fullName(lead),
        title: "Final Inspection Due Tomorrow",
        dueDate: dueDate.toISOString(),
        createdAt: now, followUpStatus: lead.followUpStatus,
        assignedTo: lead.assignedAgent, completed: false, priority: "high",
        sourceId: `landlord-final-inspection-${lead.id}`,
      });
      addActivity({
        id: `act-${genId()}`, leadId: lead.id, type: "follow_up_created",
        title: "Final inspection reminder created",
        description: `Complete the final inspection and key / key deposit exchange before tenant move-in on ${new Date(`${data.leaseStartDate}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}.`,
        createdAt: now, createdBy: "System",
      });
    }

    setApprovingApp(null);
    onApproved();
  };

  const handleReject = (app: RentalApplication) => {
    const now = new Date().toISOString();
    const label = app.applicantLabel || "Applicant";
    updateRentalApplication(app.id, { status: "rejected", updatedAt: now });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Application rejected — ${label}`,
      description: `Application from ${label} rejected.`,
      createdAt: now, createdBy: currentAgent,
    });
    setConfirmRejectId(null);
  };

  const handleWithdraw = (app: RentalApplication) => {
    const now = new Date().toISOString();
    const label = app.applicantLabel || "Applicant";
    updateRentalApplication(app.id, { status: "withdrawn", updatedAt: now });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Application withdrawn — ${label}`,
      description: `${label} withdrew their application.`,
      createdAt: now, createdBy: currentAgent,
    });
  };

  const handleUpdateCreditCheck = (app: RentalApplication, status: CreditCheckStatus) => {
    const now = new Date().toISOString();
    updateRentalApplication(app.id, { creditCheckStatus: status, updatedAt: now });
  };

  const handleToggleReferences = (app: RentalApplication) => {
    const now = new Date().toISOString();
    updateRentalApplication(app.id, { referencesChecked: !app.referencesChecked, updatedAt: now });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Card padding="none">
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Applications Received</h2>
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{applications.length}</span>
            {pendingCount > 0 && (
              <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
          {!approvedApp && (
            <button type="button" onClick={() => setShowLogApp(true)}
              className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">
              + Log Application
            </button>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-zinc-400">No applications received yet.</p>
            <p className="text-xs text-zinc-300 mt-1">Log each applicant as their application comes in.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {applications.map((app, idx) => {
              const isExpanded = expandedIds.has(app.id);
              const isApproved = app.status === "approved";
              const isPending = app.status === "pending";
              const isInactive = app.status === "rejected" || app.status === "withdrawn";
              const ss = STATUS_STYLES[app.status];
              const cs = CREDIT_STYLES[app.creditCheckStatus];
              const label = app.applicantLabel || `Applicant ${idx + 1}`;
              const isConfirmingReject = confirmRejectId === app.id;

              return (
                <div key={app.id} className={cn(
                  "py-4",
                  isApproved && "bg-emerald-50/40",
                  isInactive && "opacity-55"
                )}>
                  <div className="px-5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-zinc-500">#{idx + 1}</span>
                        <span className="text-sm font-medium text-zinc-900">{label}</span>
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", ss.cls)}>{ss.label}</span>
                      </div>

                      {/* Key fields */}
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                        {app.offerPrice && (
                          <span>Offer: <strong className="text-zinc-800">{fmtPrice(app.offerPrice)}/mo</strong></span>
                        )}
                        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", cs.cls)}>
                          Credit: {cs.label}
                        </span>
                        <span className={cn("text-[11px]", app.referencesChecked ? "text-emerald-700" : "text-zinc-400")}>
                          {app.referencesChecked ? "✓ References" : "References pending"}
                        </span>
                      </div>

                      {/* Notes + expand toggle */}
                      {app.notes && (
                        <div className="mt-1.5">
                          <p className={cn("text-xs text-zinc-500 leading-relaxed", !isExpanded && "line-clamp-1")}>
                            {app.notes}
                          </p>
                          {app.notes.length > 60 && (
                            <button type="button" onClick={() => toggleExpand(app.id)}
                              className="text-[11px] text-zinc-400 hover:text-zinc-600 mt-0.5 transition-colors">
                              {isExpanded ? "Show less" : "Show more"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Inline update controls for pending apps */}
                      {isPending && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <select value={app.creditCheckStatus}
                            onChange={(e) => handleUpdateCreditCheck(app, e.target.value as CreditCheckStatus)}
                            className="text-xs border border-zinc-200 rounded-md px-2 py-1 bg-white focus:outline-none">
                            <option value="not_started">Credit: Not Started</option>
                            <option value="pending">Credit: Pending</option>
                            <option value="passed">Credit: Passed</option>
                            <option value="failed">Credit: Failed</option>
                          </select>
                          <button type="button" onClick={() => handleToggleReferences(app)}
                            className={cn(
                              "text-xs border rounded-md px-2 py-1 transition-colors",
                              app.referencesChecked
                                ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                                : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                            )}>
                            {app.referencesChecked ? "✓ References" : "Mark References Done"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {isPending && !approvedApp && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {isConfirmingReject ? (
                          <>
                            <button type="button" onClick={() => handleReject(app)}
                              className="text-xs text-red-600 border border-red-200 rounded-md px-2.5 py-1 hover:bg-red-50 transition-colors">
                              Confirm Reject
                            </button>
                            <button type="button" onClick={() => setConfirmRejectId(null)}
                              className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => setApprovingApp(app)}
                              className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md px-2.5 py-1 hover:bg-emerald-50 transition-colors">
                              Approve
                            </button>
                            <button type="button" onClick={() => setConfirmRejectId(app.id)}
                              className="text-xs text-red-500 border border-red-100 rounded-md px-2.5 py-1 hover:bg-red-50 transition-colors">
                              Reject
                            </button>
                            <button type="button" onClick={() => handleWithdraw(app)}
                              className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                              Withdrawn
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {!isInactive && (
                    <CoopAgentRow
                      label="Tenant's Agent"
                      firstName={app.coopAgentFirstName}
                      lastName={app.coopAgentLastName}
                      mobile={app.coopAgentMobile}
                      brokerage={app.coopAgentBrokerage}
                      onEdit={() => setEditCoopApp(app)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modals */}
      {showLogApp && (
        <LogApplicationModal appNumber={nextAppNumber} onClose={() => setShowLogApp(false)} onSubmit={handleLogApplication} />
      )}
      {approvingApp && (
        <ConfirmLeaseModal
          app={approvingApp}
          prefillRent={prefillRent}
          onClose={() => setApprovingApp(null)}
          onSubmit={(data) => handleApprove(approvingApp, data)}
        />
      )}
      {editCoopApp && (
        <EditCoopAgentModal
          label="Tenant's Agent"
          initialData={editCoopApp}
          onClose={() => setEditCoopApp(null)}
          onSubmit={(data) => {
            const now = new Date().toISOString();
            updateRentalApplication(editCoopApp.id, { ...data, updatedAt: now });
            setEditCoopApp(null);
          }}
        />
      )}
    </>
  );
}
