"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn, genId } from "@/lib/utils";
import { fullName } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useRole, AGENT_NAME, MANAGER_NAME } from "@/lib/role-context";
import type { Lead, TenantApplication, TenantApplicationStatus, ApplicationReadiness } from "@/lib/types";
import { CoopAgentRow, CoopAgentSection, EditCoopAgentModal } from "./CoopAgentRow";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

const STATUS_STYLES: Record<TenantApplicationStatus, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-blue-100 text-blue-800" },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-800" },
  rejected:  { label: "Rejected",  cls: "bg-red-100 text-red-700" },
  withdrawn: { label: "Withdrawn", cls: "bg-zinc-100 text-zinc-500" },
};

const SORT_ORDER: Record<TenantApplicationStatus, number> = {
  pending: 0, approved: 1, rejected: 2, withdrawn: 3,
};

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

// ── New Application Modal ─────────────────────────────────────────────────────

interface LogApplicationData {
  propertyAddress: string;
  monthlyRent: string;
  landlordName: string;
  submittedAt: string;
  notes: string;
  docsReady: boolean;
  reminderDueDate?: string;
  coopAgentFirstName?: string;
  coopAgentLastName?: string;
  coopAgentMobile?: string;
  coopAgentBrokerage?: string;
}

function NewApplicationModal({ onClose, onSubmit }: {
  onClose: () => void; onSubmit: (data: LogApplicationData) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [propertyAddress, setPropertyAddress] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [submittedAt, setSubmittedAt] = useState(today);
  const [notes, setNotes] = useState("");
  const [docsReady, setDocsReady] = useState<boolean | null>(null);
  const [reminderDueDate, setReminderDueDate] = useState("");
  const [coopFirst, setCoopFirst]         = useState("");
  const [coopLast, setCoopLast]           = useState("");
  const [coopMobile, setCoopMobile]       = useState("");
  const [coopBrokerage, setCoopBrokerage] = useState("");

  const addressValid = propertyAddress.trim().length > 0;
  const docsValid = docsReady === true || (docsReady === false && reminderDueDate.length > 0);
  const canSubmit = addressValid && docsValid;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      propertyAddress, monthlyRent, landlordName, submittedAt, notes,
      docsReady: docsReady!,
      reminderDueDate: docsReady === false ? reminderDueDate : undefined,
      coopAgentFirstName: coopFirst || undefined,
      coopAgentLastName:  coopLast  || undefined,
      coopAgentMobile:    coopMobile || undefined,
      coopAgentBrokerage: coopBrokerage || undefined,
    });
  };

  return (
    <Modal title="New Application" onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Log Application" disabled={!canSubmit} onClick={handleSubmit} /></>}>
      <div>
        <label className={fl}>Property Address <span className="text-red-400">*</span></label>
        <input type="text" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)}
          placeholder="e.g. 402 Harbour St, Unit 1205" className={fi} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>Monthly Rent <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="text" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)}
            placeholder="e.g. 2500" className={fi} />
        </div>
        <div>
          <label className={fl}>Date Submitted</label>
          <input type="date" value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} className={fi} />
        </div>
      </div>
      <div>
        <label className={fl}>Landlord / Property Manager <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={landlordName} onChange={(e) => setLandlordName(e.target.value)}
          placeholder="e.g. Medallion Corp" className={fi} />
      </div>
      <div>
        <label className={fl}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Any details about the unit, application requirements, timeline…"
          className={cn(fi, "resize-none")} />
      </div>

      {/* Document readiness — required */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-3">
        <div>
          <p className="text-sm font-medium text-zinc-800">Have all required documents been received? <span className="text-red-400">*</span></p>
          <p className="text-xs text-zinc-400 mt-0.5">e.g. employment letter, pay stubs, credit check consent, references</p>
        </div>
        <div className="flex gap-2">
          {[{ v: true, label: "Yes — all ready" }, { v: false, label: "No — some missing" }].map(({ v, label }) => (
            <button key={String(v)} type="button" onClick={() => { setDocsReady(v); if (v) setReminderDueDate(""); }}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
                docsReady === v
                  ? v ? "bg-emerald-600 text-white border-emerald-600" : "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
              )}>
              {label}
            </button>
          ))}
        </div>
        {docsReady === false && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-amber-700 font-medium">Set a reminder to collect missing documents before the application is reviewed.</p>
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1">Reminder Date <span className="text-red-400">*</span></label>
              <input type="date" value={reminderDueDate} onChange={(e) => setReminderDueDate(e.target.value)} className={fi} />
            </div>
          </div>
        )}
        {docsReady === true && (
          <p className="text-xs text-emerald-700">✓ Application readiness will be marked as Documents Ready.</p>
        )}
      </div>

      <CoopAgentSection
        label="Listing Agent"
        firstName={coopFirst} setFirstName={setCoopFirst}
        lastName={coopLast}   setLastName={setCoopLast}
        mobile={coopMobile}   setMobile={setCoopMobile}
        brokerage={coopBrokerage} setBrokerage={setCoopBrokerage}
      />

      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Application submitted for {propertyAddress.trim() || "property"}</p>
        {docsReady === true && <p className="text-xs text-zinc-400">· Application readiness updated to Documents Ready</p>}
        {docsReady === false && reminderDueDate && <p className="text-xs text-zinc-400">· Reminder created to collect missing documents</p>}
      </div>
    </Modal>
  );
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({ app, onClose, onSubmit }: {
  app: TenantApplication; onClose: () => void; onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const canSubmit = reason.trim().length > 0;
  return (
    <Modal title="Application Rejected" onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Mark Rejected" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit(reason.trim()); }} /></>}>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Mark this application as rejected.</p>
        <p className="text-xs text-amber-700 mt-0.5">Other open applications remain active. The tenant can continue searching.</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 mb-1 font-medium text-zinc-700">{app.propertyAddress}</p>
      </div>
      <div>
        <label className={fl}>Rejection Reason <span className="text-red-400">*</span></label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="e.g. Landlord chose another applicant, income requirements not met…"
          className={cn(fi, "resize-none")} autoFocus />
      </div>
    </Modal>
  );
}

// ── Withdraw Modal ────────────────────────────────────────────────────────────

function WithdrawModal({ app, onClose, onSubmit }: {
  app: TenantApplication; onClose: () => void; onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title="Withdraw Application" onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Withdraw Application" disabled={false} onClick={() => onSubmit(reason.trim())} /></>}>
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-zinc-800">Withdraw the application for this property.</p>
        <p className="text-xs text-zinc-500 mt-0.5">Other open applications remain active.</p>
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-700">{app.propertyAddress}</p>
      </div>
      <div>
        <label className={fl}>Reason <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
          placeholder="e.g. Tenant decided to keep looking, found a better option…"
          className={cn(fi, "resize-none")} autoFocus />
      </div>
    </Modal>
  );
}

// ── Approve Modal ─────────────────────────────────────────────────────────────

interface ApproveData {
  leaseStartDate: string;
  leaseEndDate: string;
  depositPaid: boolean;
}

function ApproveModal({ app, onClose, onSubmit }: {
  app: TenantApplication; onClose: () => void; onSubmit: (data: ApproveData) => void;
}) {
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate]     = useState("");
  const [depositPaid, setDepositPaid]       = useState(false);
  const canSubmit = leaseStartDate.length > 0 && leaseEndDate.length > 0;

  return (
    <Modal title="Application Approved" onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Confirm Approval" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ leaseStartDate, leaseEndDate, depositPaid }); }} variant="emerald" /></>}>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-emerald-800">Application approved — lead moves to Lease Signed.</p>
        <p className="text-xs text-emerald-600 mt-0.5">Enter the lease dates so the renewal reminder is created automatically at close.</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-1">
        <p className="text-sm font-medium text-zinc-900">{app.propertyAddress}</p>
        {app.monthlyRent && (
          <p className="text-xs text-zinc-500">{fmtPrice(app.monthlyRent)}/mo{app.landlordName ? ` · ${app.landlordName}` : ""}</p>
        )}
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
        <input type="checkbox" checked={depositPaid} onChange={(e) => setDepositPaid(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
        <span className="text-sm text-zinc-700">Deposit paid</span>
      </label>
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will</p>
        <p className="text-xs text-zinc-400">· Mark this application as approved</p>
        <p className="text-xs text-zinc-400">· Create lease record with dates and deposit status</p>
        <p className="text-xs text-zinc-400">· Move lead to Lease Signed</p>
        <p className="text-xs text-zinc-400">· Lease renewal reminder created automatically at close (60 days before end)</p>
      </div>
    </Modal>
  );
}

// ── Edit Application Modal ────────────────────────────────────────────────────

interface EditApplicationData {
  propertyAddress: string;
  monthlyRent: string;
  landlordName: string;
  submittedAt: string;
  notes: string;
  status: TenantApplicationStatus;
}

const STATUS_OPTIONS: { value: TenantApplicationStatus; label: string }[] = [
  { value: "pending",   label: "Pending" },
  { value: "approved",  label: "Approved" },
  { value: "rejected",  label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

function EditApplicationModal({ app, onClose, onSubmit }: {
  app: TenantApplication;
  onClose: () => void;
  onSubmit: (data: EditApplicationData) => void;
}) {
  const [propertyAddress, setPropertyAddress] = useState(app.propertyAddress);
  const [monthlyRent, setMonthlyRent]         = useState(app.monthlyRent ? String(app.monthlyRent) : "");
  const [landlordName, setLandlordName]       = useState(app.landlordName ?? "");
  const [submittedAt, setSubmittedAt]         = useState(app.submittedAt);
  const [notes, setNotes]                     = useState(app.notes ?? "");
  const [status, setStatus]                   = useState<TenantApplicationStatus>(app.status);

  const canSubmit = propertyAddress.trim().length > 0;

  return (
    <Modal title="Edit Application" onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Save Changes" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ propertyAddress, monthlyRent, landlordName, submittedAt, notes, status }); }} /></>}>
      <div>
        <label className={fl}>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as TenantApplicationStatus)}
          className={cn(fi, "appearance-none")}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {app.status === "approved" && status !== "approved" && (
          <p className="text-xs text-amber-600 mt-1.5">⚠ Changing from Approved will not automatically revert the lead stage — use Move Back One Stage if needed.</p>
        )}
      </div>
      <div>
        <label className={fl}>Property Address <span className="text-red-400">*</span></label>
        <input type="text" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} className={fi} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>Monthly Rent <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="text" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)}
            placeholder="e.g. 2500" className={fi} />
        </div>
        <div>
          <label className={fl}>Date Submitted</label>
          <input type="date" value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} className={fi} />
        </div>
      </div>
      <div>
        <label className={fl}>Landlord / Property Manager <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={landlordName} onChange={(e) => setLandlordName(e.target.value)}
          placeholder="e.g. Medallion Corp" className={fi} />
      </div>
      <div>
        <label className={fl}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Any details about the unit, application requirements, timeline…"
          className={cn(fi, "resize-none")} />
      </div>
    </Modal>
  );
}

// ── Application Card ──────────────────────────────────────────────────────────

function ApplicationCard({ app, onApprove, onReject, onWithdraw, onReactivate, onEdit, onEditCoop }: {
  app: TenantApplication;
  onApprove: () => void;
  onReject:  () => void;
  onWithdraw: () => void;
  onReactivate: () => void;
  onEdit: () => void;
  onEditCoop: () => void;
}) {
  const [expanded, setExpanded] = useState(app.status === "pending");
  const ss = STATUS_STYLES[app.status];
  const isInactive = app.status === "rejected" || app.status === "withdrawn";
  const isPending  = app.status === "pending";

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">

      {/* Header — mirrors Buyer thread header (address left, badge + arrow right) */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-zinc-50 hover:bg-zinc-100/70 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{app.propertyAddress}</p>
          {isInactive && (app.rejectionReason || app.reasonForWithdrawal) && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              Reason: {app.rejectionReason ?? app.reasonForWithdrawal}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", ss.cls)}>{ss.label}</span>
          <span className="text-zinc-400 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Body — mirrors Buyer thread body (inner rounded card + right-side action buttons) */}
      {expanded && (
        <>
          <div className="px-4 py-3 space-y-3 border-t border-zinc-100">
            {/* Application detail card — mirrors Buyer's round card */}
            <div className={cn(
              "rounded-xl border px-3 py-2.5",
              isPending ? "border-blue-200 bg-blue-50/30" : "border-zinc-100"
            )}>
              <div className="flex items-start gap-3 justify-between">
                {/* Left: details */}
                <div className="flex-1 min-w-0">
                  {app.monthlyRent && (
                    <p className="text-base font-semibold text-zinc-900">{fmtPrice(app.monthlyRent)}/mo</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-400 mt-0.5">
                    {app.landlordName && <span>Landlord: {app.landlordName}</span>}
                    {app.submittedAt  && <span>Submitted {fmtDate(app.submittedAt)}</span>}
                  </div>
                  {app.notes && (
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{app.notes}</p>
                  )}
                </div>

                {/* Right: action buttons — mirrors Buyer's vertical button stack */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {isPending && (<>
                    <button type="button" onClick={onApprove}
                      className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md px-2.5 py-1 hover:bg-emerald-50 transition-colors">
                      Approved ✓
                    </button>
                    <button type="button" onClick={onReject}
                      className="text-xs text-red-500 border border-red-100 rounded-md px-2.5 py-1 hover:bg-red-50 transition-colors">
                      Rejected ✗
                    </button>
                    <button type="button" onClick={onWithdraw}
                      className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                      Withdraw
                    </button>
                  </>)}
                  {isInactive && (
                    <button type="button" onClick={onReactivate}
                      className="text-xs font-medium text-zinc-700 border border-zinc-300 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                      Reactivate
                    </button>
                  )}
                  <button type="button" onClick={onEdit}
                    className="text-xs text-zinc-500 border border-zinc-300 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Coop agent row — full-width at card bottom, same as Buyer */}
          <CoopAgentRow
            label="Listing Agent"
            firstName={app.coopAgentFirstName}
            lastName={app.coopAgentLastName}
            mobile={app.coopAgentMobile}
            brokerage={app.coopAgentBrokerage}
            onEdit={onEditCoop}
          />
        </>
      )}
    </div>
  );
}

// ── Main TenantApplicationPanel ───────────────────────────────────────────────

export function TenantApplicationPanel({ lead, onApproved }: { lead: Lead; onApproved: (trackingId: string) => void }) {
  const {
    tenantApplications, addTenantApplication, updateTenantApplication,
    addTenantLeaseDetails, addActivity, updateLead, addReminder, cancelRemindersBySourceId,
  } = useStore();
  const { role } = useRole();
  const currentAgent = role === "agent" ? AGENT_NAME : MANAGER_NAME;

  const applications = [...tenantApplications.filter((a) => a.leadId === lead.id)]
    .sort((a, b) => {
      const s = SORT_ORDER[a.status] - SORT_ORDER[b.status];
      if (s !== 0) return s;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const allClosed = applications.length > 0 &&
    applications.every((a) => a.status === "rejected" || a.status === "withdrawn");

  const [showNewApp, setShowNewApp]         = useState(false);
  const [approvingApp, setApprovingApp]     = useState<TenantApplication | null>(null);
  const [rejectingApp, setRejectingApp]     = useState<TenantApplication | null>(null);
  const [withdrawingApp, setWithdrawingApp] = useState<TenantApplication | null>(null);
  const [editingApp, setEditingApp]         = useState<TenantApplication | null>(null);
  const [editCoopApp, setEditCoopApp]       = useState<TenantApplication | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleNew = (data: LogApplicationData) => {
    const now = new Date().toISOString();
    const rentNum = data.monthlyRent.trim() ? parseFloat(data.monthlyRent.replace(/[^0-9.]/g, "")) || undefined : undefined;
    const app: TenantApplication = {
      id: `ta-${genId()}`, leadId: lead.id,
      propertyAddress: data.propertyAddress.trim(),
      ...(rentNum !== undefined && { monthlyRent: rentNum }),
      landlordName: data.landlordName.trim() || undefined,
      status: "pending",
      submittedAt: data.submittedAt,
      notes: data.notes.trim() || undefined,
      ...(data.coopAgentFirstName && { coopAgentFirstName: data.coopAgentFirstName }),
      ...(data.coopAgentLastName  && { coopAgentLastName:  data.coopAgentLastName }),
      ...(data.coopAgentMobile    && { coopAgentMobile:    data.coopAgentMobile }),
      ...(data.coopAgentBrokerage && { coopAgentBrokerage: data.coopAgentBrokerage }),
      createdBy: currentAgent, createdAt: now, updatedAt: now,
    };
    addTenantApplication(app);
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Application submitted — ${data.propertyAddress.trim()}`,
      description: [
        rentNum ? `Rent: ${fmtPrice(rentNum)}/mo` : null,
        data.landlordName.trim() && `Landlord: ${data.landlordName.trim()}`,
        `Submitted: ${fmtDate(data.submittedAt)}`,
        data.docsReady ? "All documents ready." : "Documents incomplete — reminder set.",
        data.notes.trim(),
      ].filter(Boolean).join(". "),
      createdAt: now, createdBy: currentAgent,
    });

    if (data.docsReady) {
      updateLead(lead.id, { applicationReadiness: "Documents Ready" as ApplicationReadiness, updatedAt: now });
    } else if (data.reminderDueDate) {
      addReminder({
        id: `r-${genId()}-docs`,
        leadId: lead.id,
        leadName: fullName(lead),
        title: `Collect missing documents — ${data.propertyAddress.trim()}`,
        dueDate: new Date(`${data.reminderDueDate}T09:00:00`).toISOString(),
        createdAt: now,
        followUpStatus: lead.followUpStatus,
        assignedTo: lead.assignedAgent,
        completed: false,
        priority: "high",
      });
      addActivity({
        id: `act-${genId()}`, leadId: lead.id, type: "follow_up_created",
        title: `Reminder set — collect missing documents`,
        description: `Documents not yet complete for ${data.propertyAddress.trim()}. Reminder set for ${fmtDate(data.reminderDueDate)}.`,
        createdAt: now, createdBy: currentAgent,
      });
    }
    setShowNewApp(false);
  };

  const handleApprove = (app: TenantApplication, data: ApproveData) => {
    const now = new Date().toISOString();
    updateTenantApplication(app.id, { status: "approved", updatedAt: now });
    addTenantLeaseDetails({
      id: `tld-${genId()}`, leadId: lead.id, applicationId: app.id,
      propertyAddress: app.propertyAddress,
      monthlyRent: app.monthlyRent ?? 0,
      leaseStartDate: data.leaseStartDate,
      leaseEndDate: data.leaseEndDate,
      depositPaid: data.depositPaid,
      createdBy: currentAgent, createdAt: now, updatedAt: now,
    });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Application approved — ${app.propertyAddress}`,
      description: [
        app.monthlyRent ? `Rent: ${fmtPrice(app.monthlyRent)}/mo` : null,
        `Lease: ${fmtDate(data.leaseStartDate)} – ${fmtDate(data.leaseEndDate)}`,
        data.depositPaid ? "Deposit paid." : "Deposit pending.",
      ].filter(Boolean).join(". "),
      createdAt: now, createdBy: currentAgent,
    });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
      title: "Lease signed — moved to Lease Signed",
      description: "Tenant application approved and lease dates confirmed.",
      createdAt: now, createdBy: currentAgent,
    });
    updateLead(lead.id, { stage: "Under Contract", applicationReadiness: undefined as unknown as ApplicationReadiness, updatedAt: now });

    // Final inspection reminder — 1 day before lease start
    if (data.leaseStartDate) {
      cancelRemindersBySourceId(`tenant-final-inspection-${lead.id}`);
      const dueDate = new Date(`${data.leaseStartDate}T09:00:00`);
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
        description: `Complete the final tenant inspection and key / key deposit exchange before move-in on ${fmtDate(data.leaseStartDate)}.`,
        createdAt: now,
        createdBy: "System",
      });
    }

    setApprovingApp(null);
    onApproved(app.id);
  };

  const handleReject = (app: TenantApplication, reason: string) => {
    const now = new Date().toISOString();
    updateTenantApplication(app.id, { status: "rejected", rejectionReason: reason, updatedAt: now });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Application rejected — ${app.propertyAddress}`,
      description: `Reason: ${reason}.`,
      createdAt: now, createdBy: currentAgent,
    });
    setRejectingApp(null);
  };

  const handleWithdraw = (app: TenantApplication, reason: string) => {
    const now = new Date().toISOString();
    updateTenantApplication(app.id, { status: "withdrawn", reasonForWithdrawal: reason || undefined, updatedAt: now });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Application withdrawn — ${app.propertyAddress}`,
      description: reason ? `Reason: ${reason}.` : "",
      createdAt: now, createdBy: currentAgent,
    });
    setWithdrawingApp(null);
  };

  const handleEdit = (app: TenantApplication, data: EditApplicationData) => {
    const now = new Date().toISOString();
    const rentNum = data.monthlyRent.trim() ? parseFloat(data.monthlyRent.replace(/[^0-9.]/g, "")) || undefined : undefined;
    const newAddress = data.propertyAddress.trim();
    updateTenantApplication(app.id, {
      propertyAddress: newAddress,
      monthlyRent: rentNum,
      landlordName: data.landlordName.trim() || undefined,
      submittedAt: data.submittedAt,
      notes: data.notes.trim() || undefined,
      status: data.status,
      updatedAt: now,
    });
    // Mirror Buyer: if the approved application's property address changed, reset the checklist
    if (app.status === "approved" && newAddress !== app.propertyAddress) {
      onApproved(genId());
    }
    setEditingApp(null);
  };

  const handleReactivate = (app: TenantApplication) => {
    const now = new Date().toISOString();
    updateTenantApplication(app.id, {
      status: "pending",
      rejectionReason: undefined,
      reasonForWithdrawal: undefined,
      updatedAt: now,
    });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Application reactivated — ${app.propertyAddress}`,
      description: "Application returned to pending status.",
      createdAt: now, createdBy: currentAgent,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <Card padding="none">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Applications</h2>
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{applications.length}</span>
          </div>
          <button type="button" onClick={() => setShowNewApp(true)}
            className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">
            + New Application
          </button>
        </div>

        {/* Empty state */}
        {applications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-zinc-400">No applications logged yet.</p>
            <p className="text-xs text-zinc-300 mt-1">Click &ldquo;+ New Application&rdquo; to log the first one.</p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-3">
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                onApprove={() => setApprovingApp(app)}
                onReject={() => setRejectingApp(app)}
                onWithdraw={() => setWithdrawingApp(app)}
                onReactivate={() => handleReactivate(app)}
                onEdit={() => setEditingApp(app)}
                onEditCoop={() => setEditCoopApp(app)}
              />
            ))}
          </div>
        )}

        {/* What's Next? — only when ALL threads are rejected/withdrawn */}
        {allClosed && (
          <div className="mx-4 mb-4 mt-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">What&rsquo;s Next?</p>
            <p className="text-xs text-amber-700 mt-0.5">All applications are closed. Start a new application for another property, or mark this lead as lost if the search is over.</p>
          </div>
        )}

        {/* + New Application — always at bottom */}
        <div className="px-4 pb-4 pt-1">
          <button type="button" onClick={() => setShowNewApp(true)}
            className="w-full text-sm font-medium text-zinc-500 border border-dashed border-zinc-300 rounded-xl py-2.5 hover:bg-zinc-50 hover:text-zinc-700 transition-colors">
            + New Application
          </button>
        </div>
      </Card>

      {/* Modals */}
      {showNewApp && (
        <NewApplicationModal onClose={() => setShowNewApp(false)} onSubmit={handleNew} />
      )}
      {approvingApp && (
        <ApproveModal app={approvingApp} onClose={() => setApprovingApp(null)}
          onSubmit={(data) => handleApprove(approvingApp, data)} />
      )}
      {rejectingApp && (
        <RejectModal app={rejectingApp} onClose={() => setRejectingApp(null)}
          onSubmit={(reason) => handleReject(rejectingApp, reason)} />
      )}
      {withdrawingApp && (
        <WithdrawModal app={withdrawingApp} onClose={() => setWithdrawingApp(null)}
          onSubmit={(reason) => handleWithdraw(withdrawingApp, reason)} />
      )}
      {editingApp && (
        <EditApplicationModal app={editingApp} onClose={() => setEditingApp(null)}
          onSubmit={(data) => handleEdit(editingApp, data)} />
      )}
      {editCoopApp && (
        <EditCoopAgentModal
          label="Listing Agent"
          initialData={editCoopApp}
          onClose={() => setEditCoopApp(null)}
          onSubmit={(data) => {
            updateTenantApplication(editCoopApp.id, { ...data, updatedAt: new Date().toISOString() });
            setEditCoopApp(null);
          }}
        />
      )}
    </>
  );
}
