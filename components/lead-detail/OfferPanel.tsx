"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { cn, formatDate, genId } from "@/lib/utils";
import { fullName } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useRole, AGENT_NAME, MANAGER_NAME } from "@/lib/role-context";
import { getStageDisplayName, CONDITION_TYPE_LABELS as CONDITION_LABELS } from "@/lib/constants";
import { CoopAgentRow, CoopAgentSection, EditCoopAgentModal } from "./CoopAgentRow";
import type {
  Lead,
  OfferRound,
  OfferDirection,
  OfferRoundStatus,
  AcceptedOffer,
  OfferCondition,
  ConditionType,
  DealStatus,
  BuyerOfferThread,
  BuyerOfferThreadStatus,
} from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const DIRECTION_LABELS: Record<OfferDirection, string> = {
  buyer_submitted: "Buyer submitted",
  seller_counter: "Seller counter",
  buyer_counter: "Buyer counter",
};

const DIRECTION_OPTIONS: { value: OfferDirection; label: string }[] = [
  { value: "buyer_submitted", label: "Buyer submitted" },
  { value: "seller_counter", label: "Seller counter" },
  { value: "buyer_counter", label: "Buyer counter" },
];

// Use shared CONDITION_LABELS (imported from constants as CONDITION_LABELS)
const CONDITION_TYPE_LABELS = CONDITION_LABELS;

const CONDITION_TYPE_OPTIONS: { value: ConditionType; label: string }[] = [
  { value: "financing", label: "Financing" },
  { value: "home_inspection", label: "Home Inspection" },
  { value: "status_certificate", label: "Status Certificate" },
  { value: "sale_of_property", label: "Sale of Property" },
  { value: "lawyer_review", label: "Lawyer Review" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "other", label: "Other" },
];

const ROUND_STATUS_STYLES: Record<OfferRoundStatus, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-blue-100 text-blue-800" },
  accepted:  { label: "Accepted",  cls: "bg-emerald-100 text-emerald-800" },
  countered: { label: "Countered", cls: "bg-zinc-100 text-zinc-600" },
  rejected:  { label: "Rejected",  cls: "bg-red-100 text-red-700" },
  expired:   { label: "Expired",   cls: "bg-zinc-100 text-zinc-400" },
};

const DEAL_STATUS_STYLES: Record<DealStatus, { label: string; cls: string }> = {
  conditional:  { label: "Conditional",  cls: "bg-amber-100 text-amber-800" },
  firm:          { label: "Firm",          cls: "bg-emerald-100 text-emerald-800" },
  fell_through:  { label: "Fell Through",  cls: "bg-red-100 text-red-700" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtPrice = (n: number) => `$${n.toLocaleString("en-CA")}`;

const fmtOfferDT = (dt: string) =>
  new Date(dt).toLocaleString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

const parsePriceInput = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

function computeDealStatus(conditions: OfferCondition[]): DealStatus {
  if (conditions.length === 0) return "firm";
  const now = new Date();
  if (conditions.some((c) => c.resolution === "pending" && new Date(`${c.conditionDeadline}T23:59:59`) < now))
    return "fell_through";
  if (conditions.every((c) => c.resolution !== "pending")) return "firm";
  return "conditional";
}

function getCounterDirection(dir: OfferDirection): OfferDirection {
  return dir === "seller_counter" ? "buyer_counter" : "seller_counter";
}

// ── Shared modal UI ───────────────────────────────────────────────────────────

const fi = "w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition border-zinc-200 focus:ring-zinc-300";
const fs = `${fi} appearance-none`;
const fl = "text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1.5";

function OfferModal({ title, onClose, children, footer }: {
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

// ── Add / Counter Round Modal ─────────────────────────────────────────────────

interface RoundFormData {
  direction: OfferDirection;
  offerPrice: string;
  irrevocableDate: string;
  irrevocableTime: string;
  depositAmount: string;
}

function AddRoundModal({
  nextRoundNumber, prefill, onClose, onSubmit,
}: {
  nextRoundNumber: number;
  prefill?: Pick<OfferRound, "direction" | "offerPrice"> & { depositAmount?: number };
  onClose: () => void;
  onSubmit: (data: RoundFormData) => void;
}) {
  const [direction, setDirection] = useState<OfferDirection>(
    prefill ? getCounterDirection(prefill.direction) : "buyer_submitted"
  );
  const [offerPrice, setOfferPrice] = useState(prefill ? String(prefill.offerPrice) : "");
  const [irrevocableDate, setIrrevocableDate] = useState("");
  const [irrevocableTime, setIrrevocableTime] = useState("21:00");
  const [depositAmount, setDepositAmount] = useState(
    prefill?.depositAmount ? String(prefill.depositAmount) : ""
  );

  const canSubmit = offerPrice.trim().length > 0 && irrevocableDate.length > 0 && parsePriceInput(offerPrice) > 0;
  const isCounter = nextRoundNumber > 1 && !!prefill;

  return (
    <OfferModal
      title={isCounter ? `Log Round ${nextRoundNumber} — Counter` : "Log Offer — Round 1"}
      onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Log Round" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ direction, offerPrice, irrevocableDate, irrevocableTime, depositAmount }); }} /></>}
    >
      <div>
        <label className={fl}>Direction</label>
        <Select value={direction} onChange={(e) => setDirection(e.target.value as OfferDirection)} className={fs}>
          {DIRECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>
      <div>
        <label className={fl}>Offer Price <span className="text-red-400">*</span></label>
        <input type="text" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)}
          placeholder="e.g. 1385000" className={fi} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>Irrevocable Date <span className="text-red-400">*</span></label>
          <input type="date" value={irrevocableDate} onChange={(e) => setIrrevocableDate(e.target.value)} className={fi} />
        </div>
        <div>
          <label className={fl}>Time</label>
          <input type="time" value={irrevocableTime} onChange={(e) => setIrrevocableTime(e.target.value)} className={fi} />
        </div>
      </div>
      <div>
        <label className={fl}>Deposit Amount <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="e.g. 50000" className={fi} />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· {DIRECTION_LABELS[direction]} — Round {nextRoundNumber}</p>
        <p className="text-xs text-zinc-400">· Reminder 1 hour before irrevocable date</p>
      </div>
    </OfferModal>
  );
}

// ── Edit Round Modal ──────────────────────────────────────────────────────────

interface EditRoundFormData extends RoundFormData {
  status: OfferRoundStatus;
}

function EditRoundModal({
  round, onClose, onSubmit,
}: {
  round: OfferRound;
  onClose: () => void;
  onSubmit: (data: EditRoundFormData) => void;
}) {
  const [direction, setDirection] = useState<OfferDirection>(round.direction);
  const [offerPrice, setOfferPrice] = useState(String(round.offerPrice));
  const irrDt = new Date(round.irrevocableAt);
  const irrDateStr = irrDt.toISOString().slice(0, 10);
  const irrTimeStr = irrDt.toTimeString().slice(0, 5);
  const [irrevocableDate, setIrrevocableDate] = useState(irrDateStr);
  const [irrevocableTime, setIrrevocableTime] = useState(irrTimeStr);
  const [depositAmount, setDepositAmount] = useState(round.depositAmount ? String(round.depositAmount) : "");
  const [status, setStatus] = useState<OfferRoundStatus>(round.status);

  const statusOptions: { value: OfferRoundStatus; label: string }[] = [
    { value: "active",    label: "Active" },
    { value: "countered", label: "Countered" },
    { value: "rejected",  label: "Rejected" },
    { value: "expired",   label: "Expired" },
  ];
  // Accepted stays in the list only if the round is already accepted (can downgrade it)
  if (round.status === "accepted") {
    statusOptions.unshift({ value: "accepted", label: "Accepted" });
  }

  const canSubmit = offerPrice.trim().length > 0 && irrevocableDate.length > 0 && parsePriceInput(offerPrice) > 0;

  return (
    <OfferModal
      title={`Edit Round ${round.roundNumber}`}
      onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Save Changes" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ direction, offerPrice, irrevocableDate, irrevocableTime, depositAmount, status }); }} /></>}
    >
      <div>
        <label className={fl}>Status</label>
        <Select value={status} onChange={(e) => setStatus(e.target.value as OfferRoundStatus)} className={fs}>
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        {round.status === "accepted" && status !== "accepted" && (
          <p className="text-xs text-amber-600 mt-1.5">⚠ Changing from Accepted will void the accepted offer and all related reminders.</p>
        )}
      </div>
      <div>
        <label className={fl}>Direction</label>
        <Select value={direction} onChange={(e) => setDirection(e.target.value as OfferDirection)} className={fs}>
          {DIRECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>
      <div>
        <label className={fl}>Offer Price <span className="text-red-400">*</span></label>
        <input type="text" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} className={fi} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>Irrevocable Date <span className="text-red-400">*</span></label>
          <input type="date" value={irrevocableDate} onChange={(e) => setIrrevocableDate(e.target.value)} className={fi} />
        </div>
        <div>
          <label className={fl}>Time</label>
          <input type="time" value={irrevocableTime} onChange={(e) => setIrrevocableTime(e.target.value)} className={fi} />
        </div>
      </div>
      <div>
        <label className={fl}>Deposit Amount <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="e.g. 50000" className={fi} />
      </div>
    </OfferModal>
  );
}

// ── Confirm Acceptance Modal ──────────────────────────────────────────────────

interface ConditionFormRow {
  tempId: string;
  conditionType: ConditionType;
  conditionLabel: string;
  conditionDeadline: string;
}

export interface DepositInstallmentRow {
  tempId: string;
  amount: string;
  dueDate: string;
}

export interface AcceptOfferFormData {
  acceptedPrice: string;
  multipleInstallments: boolean;
  depositDueAt: string;
  depositAmount: string;
  installments: DepositInstallmentRow[];
  closingDate: string;
  titleSearchDate: string;
  conditions: ConditionFormRow[];
}

export function ConfirmAcceptanceModal({
  round, onClose, onSubmit,
}: {
  round: OfferRound;
  onClose: () => void;
  onSubmit: (data: AcceptOfferFormData) => void;
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [acceptedPrice, setAcceptedPrice] = useState(String(round.offerPrice));
  const [multipleInstallments, setMultipleInstallments] = useState(false);
  const [depositDueAt, setDepositDueAt] = useState("");
  const [depositAmount, setDepositAmount] = useState(round.depositAmount ? String(round.depositAmount) : "");
  const [installments, setInstallments] = useState<DepositInstallmentRow[]>([
    { tempId: "inst-1", amount: "", dueDate: "" },
    { tempId: "inst-2", amount: "", dueDate: "" },
  ]);
  const [closingDate, setClosingDate] = useState("");
  const [titleSearchDate, setTitleSearchDate] = useState("");
  const [conditions, setConditions] = useState<ConditionFormRow[]>([]);

  const addCondition = () =>
    setConditions((p) => [...p, {
      tempId: `tmp-${Date.now()}-${Math.random()}`,
      conditionType: "financing", conditionLabel: "", conditionDeadline: "",
    }]);

  const removeCondition = (id: string) => setConditions((p) => p.filter((c) => c.tempId !== id));

  const patchCondition = (id: string, patch: Partial<ConditionFormRow>) =>
    setConditions((p) => p.map((c) => c.tempId === id ? { ...c, ...patch } : c));

  const patchInstallment = (id: string, patch: Partial<DepositInstallmentRow>) =>
    setInstallments((p) => p.map((i) => i.tempId === id ? { ...i, ...patch } : i));

  const addInstallment = () =>
    setInstallments((p) => [...p, { tempId: `inst-${Date.now()}`, amount: "", dueDate: "" }]);

  const removeInstallment = (id: string) =>
    setInstallments((p) => p.filter((i) => i.tempId !== id));

  const conditionsValid = conditions.every(
    (c) => c.conditionDeadline.length > 0 && (c.conditionType !== "other" || c.conditionLabel.trim().length > 0)
  );
  const filledInstallments = installments.filter((i) => i.amount.trim().length > 0 || i.dueDate.length > 0);
  const depositValid = multipleInstallments
    ? filledInstallments.length > 0 && filledInstallments.every((i) => i.amount.trim().length > 0 && i.dueDate.length > 0)
    : depositDueAt.length > 0;
  const canSubmit = parsePriceInput(acceptedPrice) > 0 && depositValid && closingDate.length > 0 && conditionsValid;

  return (
    <OfferModal
      title="Confirm Acceptance"
      onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Confirm Acceptance" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ acceptedPrice, multipleInstallments, depositDueAt, depositAmount, installments: filledInstallments, closingDate, titleSearchDate, conditions }); }} variant="emerald" /></>}
    >
      {/* Confirmation framing */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-emerald-800">Offer price is pre-filled from Round {round.roundNumber}.</p>
        <p className="text-xs text-emerald-600 mt-0.5">Add the closing date and any conditions, then confirm.</p>
      </div>

      {/* Accepted price — read-only by default */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={cn(fl, "mb-0")}>Accepted Price</label>
          {!editingPrice && (
            <button type="button" onClick={() => setEditingPrice(true)}
              className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors">
              Edit
            </button>
          )}
        </div>
        {editingPrice ? (
          <input type="text" value={acceptedPrice} onChange={(e) => setAcceptedPrice(e.target.value)}
            className={fi} autoFocus />
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">{fmtPrice(parsePriceInput(acceptedPrice))}</p>
            <span className="text-xs text-zinc-400">from Round {round.roundNumber}</span>
          </div>
        )}
        {round.depositAmount !== undefined && (
          <p className="text-xs text-zinc-400 mt-1.5">
            Deposit from offer: {fmtPrice(round.depositAmount)}
          </p>
        )}
      </div>

      {/* Deposit section */}
      <div className="border border-zinc-200 rounded-xl px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Deposit</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Multiple installments?</span>
            <button type="button" onClick={() => setMultipleInstallments(!multipleInstallments)}
              className={cn("w-8 h-4 rounded-full border-2 relative transition-colors shrink-0",
                multipleInstallments ? "bg-zinc-900 border-zinc-900" : "bg-white border-zinc-300")}>
              <span className={cn("absolute top-0 left-0 w-3 h-3 rounded-full bg-white shadow transition-transform",
                multipleInstallments ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>
        </div>
        {!multipleInstallments ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fl}>Amount <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
              <input type="text" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="e.g. 50000" className={fi} />
            </div>
            <div>
              <label className={fl}>Due Date <span className="text-red-400">*</span></label>
              <input type="date" value={depositDueAt} onChange={(e) => setDepositDueAt(e.target.value)} className={fi} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {installments.map((inst, idx) => (
              <div key={inst.tempId} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 shrink-0 w-16">Installment {idx + 1}</span>
                <input type="text" value={inst.amount} onChange={(e) => patchInstallment(inst.tempId, { amount: e.target.value })}
                  placeholder="Amount" className={cn(fi, "flex-1")} />
                <input type="date" value={inst.dueDate} onChange={(e) => patchInstallment(inst.tempId, { dueDate: e.target.value })}
                  className={cn(fi, "flex-1")} />
                {installments.length > 1 && (
                  <button type="button" onClick={() => removeInstallment(inst.tempId)}
                    className="text-zinc-300 hover:text-zinc-500 text-lg leading-none shrink-0">×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addInstallment}
              className="text-xs text-zinc-600 border border-dashed border-zinc-300 rounded-lg px-3 py-1.5 w-full hover:bg-zinc-50 transition-colors">
              + Add Installment
            </button>
          </div>
        )}
      </div>

      {/* Closing date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>Closing Date <span className="text-red-400">*</span></label>
          <input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} className={fi} />
        </div>
        <div>
          <label className={fl}>Title Search Date <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="date" value={titleSearchDate} onChange={(e) => setTitleSearchDate(e.target.value)} className={fi} />
          {!titleSearchDate && <p className="text-[11px] text-zinc-400 mt-1">Agent will receive a reminder 2 days before this date.</p>}
        </div>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={cn(fl, "mb-0")}>Conditions</label>
          <button type="button" onClick={addCondition}
            className="text-xs text-zinc-600 border border-zinc-200 rounded-lg px-2.5 py-1 hover:bg-zinc-50 transition-colors">
            + Add Condition
          </button>
        </div>
        {conditions.length === 0 && (
          <p className="text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl px-4 py-3 text-center">
            No conditions — deal will be firm immediately on acceptance.
          </p>
        )}
        <div className="space-y-3">
          {conditions.map((cond) => (
            <div key={cond.tempId} className="border border-zinc-200 rounded-xl px-3 py-3 space-y-2.5 relative">
              <button type="button" onClick={() => removeCondition(cond.tempId)}
                className="absolute top-2.5 right-3 text-zinc-300 hover:text-zinc-500 text-lg leading-none">×</button>
              <div>
                <label className={fl}>Type</label>
                <Select value={cond.conditionType}
                  onChange={(e) => patchCondition(cond.tempId, { conditionType: e.target.value as ConditionType })}
                  className={fs}>
                  {CONDITION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
              {cond.conditionType === "other" && (
                <div>
                  <label className={fl}>Label <span className="text-red-400">*</span></label>
                  <input type="text" value={cond.conditionLabel}
                    onChange={(e) => patchCondition(cond.tempId, { conditionLabel: e.target.value })}
                    placeholder="e.g. Lawyer review" className={fi} />
                </div>
              )}
              <div>
                <label className={fl}>Deadline <span className="text-red-400">*</span></label>
                <input type="date" value={cond.conditionDeadline}
                  onChange={(e) => patchCondition(cond.tempId, { conditionDeadline: e.target.value })}
                  className={fi} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">Reminders will be created for</p>
        {!multipleInstallments && depositDueAt && <p className="text-xs text-zinc-400">· Deposit due — {depositDueAt}</p>}
        {multipleInstallments && installments.filter(i => i.dueDate).length > 0 && (
          <p className="text-xs text-zinc-400">· {installments.filter(i => i.dueDate).length} deposit installment reminder{installments.filter(i => i.dueDate).length > 1 ? "s" : ""}</p>
        )}
        {closingDate && <p className="text-xs text-zinc-400">· Closing — 14d, 7d, 2d before {closingDate}</p>}
        {closingDate && <p className="text-xs text-zinc-400">· Final buyer inspection — 2 days before {closingDate}</p>}
        {titleSearchDate && <p className="text-xs text-zinc-400">· Title search — 2 days before {titleSearchDate}</p>}
        {conditions.length > 0 && (
          <p className="text-xs text-zinc-400">· {conditions.length} condition deadline{conditions.length > 1 ? "s" : ""} — 2 days before each</p>
        )}
      </div>
    </OfferModal>
  );
}

// ── Edit Accepted Offer modal ─────────────────────────────────────────────────

export function EditAcceptedOfferModal({
  acceptedOffer, onClose, onSubmit,
}: {
  acceptedOffer: AcceptedOffer;
  onClose: () => void;
  onSubmit: (data: AcceptOfferFormData) => void;
}) {
  const hasInstallments = !!(acceptedOffer.depositInstallments && acceptedOffer.depositInstallments.length > 1);
  const [editingPrice, setEditingPrice] = useState(false);
  const [acceptedPrice, setAcceptedPrice] = useState(String(acceptedOffer.acceptedPrice));
  const [multipleInstallments, setMultipleInstallments] = useState(hasInstallments);
  const [depositDueAt, setDepositDueAt] = useState(hasInstallments ? "" : (acceptedOffer.depositDueAt ?? ""));
  const [depositAmount] = useState("");
  const [installments, setInstallments] = useState<DepositInstallmentRow[]>(
    hasInstallments
      ? acceptedOffer.depositInstallments!.map((i) => ({
          tempId: `inst-${i.installmentNumber}`,
          amount: String(i.amount),
          dueDate: i.dueDate,
        }))
      : [{ tempId: "inst-1", amount: "", dueDate: "" }, { tempId: "inst-2", amount: "", dueDate: "" }]
  );
  const [closingDate, setClosingDate] = useState(acceptedOffer.closingDate);
  const [titleSearchDate, setTitleSearchDate] = useState(acceptedOffer.titleSearchDate ?? "");

  const patchInstallment = (id: string, patch: Partial<DepositInstallmentRow>) =>
    setInstallments((p) => p.map((i) => i.tempId === id ? { ...i, ...patch } : i));
  const addInstallment = () =>
    setInstallments((p) => [...p, { tempId: `inst-${Date.now()}`, amount: "", dueDate: "" }]);
  const removeInstallment = (id: string) =>
    setInstallments((p) => p.filter((i) => i.tempId !== id));

  const filledInstallments = installments.filter((i) => i.amount.trim().length > 0 || i.dueDate.length > 0);
  const depositValid = multipleInstallments
    ? filledInstallments.length > 0 && filledInstallments.every((i) => i.amount.trim().length > 0 && i.dueDate.length > 0)
    : depositDueAt.length > 0;
  const canSubmit = parsePriceInput(acceptedPrice) > 0 && depositValid && closingDate.length > 0;

  return (
    <OfferModal
      title="Edit Accepted Offer"
      onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Save Changes" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ acceptedPrice, multipleInstallments, depositDueAt, depositAmount, installments: filledInstallments, closingDate, titleSearchDate, conditions: [] }); }} variant="emerald" /></>}
    >
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={cn(fl, "mb-0")}>Accepted Price</label>
          {!editingPrice && (
            <button type="button" onClick={() => setEditingPrice(true)}
              className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors">
              Edit
            </button>
          )}
        </div>
        {editingPrice ? (
          <input type="text" value={acceptedPrice} onChange={(e) => setAcceptedPrice(e.target.value)} className={fi} autoFocus />
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <p className="text-sm font-semibold text-zinc-900">{fmtPrice(parsePriceInput(acceptedPrice))}</p>
          </div>
        )}
      </div>

      <div className="border border-zinc-200 rounded-xl px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Deposit</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Multiple installments?</span>
            <button type="button" onClick={() => setMultipleInstallments(!multipleInstallments)}
              className={cn("w-8 h-4 rounded-full border-2 relative transition-colors shrink-0",
                multipleInstallments ? "bg-zinc-900 border-zinc-900" : "bg-white border-zinc-300")}>
              <span className={cn("absolute top-0 left-0 w-3 h-3 rounded-full bg-white shadow transition-transform",
                multipleInstallments ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>
        </div>
        {!multipleInstallments ? (
          <div>
            <label className={fl}>Due Date <span className="text-red-400">*</span></label>
            <input type="date" value={depositDueAt} onChange={(e) => setDepositDueAt(e.target.value)} className={fi} />
          </div>
        ) : (
          <div className="space-y-2">
            {installments.map((inst, idx) => (
              <div key={inst.tempId} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 shrink-0 w-16">Installment {idx + 1}</span>
                <input type="text" value={inst.amount} onChange={(e) => patchInstallment(inst.tempId, { amount: e.target.value })}
                  placeholder="Amount" className={cn(fi, "flex-1")} />
                <input type="date" value={inst.dueDate} onChange={(e) => patchInstallment(inst.tempId, { dueDate: e.target.value })}
                  className={cn(fi, "flex-1")} />
                {installments.length > 1 && (
                  <button type="button" onClick={() => removeInstallment(inst.tempId)}
                    className="text-zinc-300 hover:text-zinc-500 text-lg leading-none shrink-0">×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addInstallment}
              className="text-xs text-zinc-600 border border-dashed border-zinc-300 rounded-lg px-3 py-1.5 w-full hover:bg-zinc-50 transition-colors">
              + Add Installment
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>Closing Date <span className="text-red-400">*</span></label>
          <input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} className={fi} />
        </div>
        <div>
          <label className={fl}>Title Search Date <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="date" value={titleSearchDate} onChange={(e) => setTitleSearchDate(e.target.value)} className={fi} />
        </div>
      </div>
    </OfferModal>
  );
}

// ── Thread status badge ───────────────────────────────────────────────────────

const THREAD_STATUS_STYLES: Record<BuyerOfferThreadStatus, { label: string; cls: string }> = {
  active:   { label: "Active",   cls: "bg-blue-100 text-blue-800" },
  accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-800" },
  inactive: { label: "Inactive", cls: "bg-zinc-100 text-zinc-500" },
};

// ── Mark Inactive modal ───────────────────────────────────────────────────────

const INACTIVE_REASONS = [
  { value: "Outbid", label: "Outbid" },
  { value: "Property sold", label: "Property sold" },
  { value: "Withdrew offer", label: "Withdrew offer" },
  { value: "Other", label: "Other" },
];

function MarkInactiveModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState(INACTIVE_REASONS[0].value);
  const [customReason, setCustomReason] = useState("");
  const finalReason = reason === "Other" ? customReason.trim() : reason;
  const canSubmit = reason !== "Other" || customReason.trim().length > 0;

  return (
    <OfferModal
      title="Mark Offer Inactive"
      onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Mark Inactive" disabled={!canSubmit} onClick={() => { if (canSubmit) onSubmit(finalReason); }} /></>}
    >
      <div>
        <label className={fl}>Reason</label>
        <Select value={reason} onChange={(e) => setReason(e.target.value)} className={fs}>
          {INACTIVE_REASONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>
      {reason === "Other" && (
        <div>
          <label className={fl}>Describe reason <span className="text-red-400">*</span></label>
          <input type="text" value={customReason} onChange={(e) => setCustomReason(e.target.value)}
            placeholder="e.g. Seller not responding" className={fi} autoFocus />
        </div>
      )}
    </OfferModal>
  );
}

// ── New Offer (property details) modal ────────────────────────────────────────

function NewOfferModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (address: string, mlsNumber: string, coopFirst: string, coopLast: string, coopMobile: string, coopBrokerage: string) => void;
}) {
  const [address, setAddress] = useState("");
  const [mlsNumber, setMlsNumber] = useState("");
  const [coopFirst, setCoopFirst]         = useState("");
  const [coopLast, setCoopLast]           = useState("");
  const [coopMobile, setCoopMobile]       = useState("");
  const [coopBrokerage, setCoopBrokerage] = useState("");
  const canSubmit = address.trim().length > 0;

  return (
    <OfferModal
      title="New Offer — Property Details"
      onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Continue to Round 1" disabled={!canSubmit} onClick={() => { if (canSubmit) onSubmit(address.trim(), mlsNumber.trim(), coopFirst.trim(), coopLast.trim(), coopMobile.trim(), coopBrokerage.trim()); }} /></>}
    >
      <div>
        <label className={fl}>Property Address <span className="text-red-400">*</span></label>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 142 Maple Ave" className={fi} autoFocus />
      </div>
      <div>
        <label className={fl}>MLS # <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={mlsNumber} onChange={(e) => setMlsNumber(e.target.value)}
          placeholder="e.g. C12345678" className={fi} />
      </div>
      <CoopAgentSection
        label="Listing Agent"
        firstName={coopFirst} setFirstName={setCoopFirst}
        lastName={coopLast}   setLastName={setCoopLast}
        mobile={coopMobile}   setMobile={setCoopMobile}
        brokerage={coopBrokerage} setBrokerage={setCoopBrokerage}
      />
    </OfferModal>
  );
}

// ── ThreadCard — one property offer thread ────────────────────────────────────

function ThreadCard({
  thread, rounds, acceptedOffer, conditions, lead, currentAgent, onFirm,
  addOfferRound, updateOfferRound, addAcceptedOffer, updateAcceptedOffer, removeAcceptedOffer, addOfferCondition, updateOfferCondition,
  addActivity, addReminder, cancelRemindersBySourceId, cancelRemindersBySourceIdPrefix,
  updateBuyerOfferThread,
}: {
  thread: BuyerOfferThread;
  rounds: OfferRound[];
  acceptedOffer: AcceptedOffer | undefined;
  conditions: OfferCondition[];
  lead: Lead;
  currentAgent: string;
  onFirm: (threadId: string) => void;
  addOfferRound: (r: OfferRound) => void;
  updateOfferRound: (id: string, patch: Partial<OfferRound>) => void;
  addAcceptedOffer: (ao: AcceptedOffer) => void;
  updateAcceptedOffer: (id: string, patch: Partial<AcceptedOffer>) => void;
  removeAcceptedOffer: (id: string) => void;
  addOfferCondition: (c: OfferCondition) => void;
  updateOfferCondition: (id: string, patch: Partial<OfferCondition>) => void;
  addActivity: (a: Parameters<ReturnType<typeof useStore>["addActivity"]>[0]) => void;
  addReminder: (r: Parameters<ReturnType<typeof useStore>["addReminder"]>[0]) => void;
  cancelRemindersBySourceId: (id: string) => void;
  cancelRemindersBySourceIdPrefix: (prefix: string) => void;
  updateBuyerOfferThread: (id: string, patch: Partial<BuyerOfferThread>) => void;
}) {
  const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const STATUS_SORT: Record<string, number> = { active: 0, countered: 1, accepted: 2, rejected: 3, expired: 4 };
  const displayRounds = [...sortedRounds].sort((a, b) => (STATUS_SORT[a.status] ?? 9) - (STATUS_SORT[b.status] ?? 9));

  const nextRoundNumber = sortedRounds.length + 1;
  const hasActiveRound = displayRounds.some((r) => r.status === "active" || r.status === "countered");
  const isActive = thread.status === "active";
  const isAccepted = thread.status === "accepted";

  const [expanded, setExpanded] = useState(true);
  const [showAddRound, setShowAddRound] = useState(() => isActive && !hasActiveRound && !acceptedOffer);
  const [counteringRound, setCounteringRound] = useState<OfferRound | null>(null);
  const [acceptingRound, setAcceptingRound] = useState<OfferRound | null>(null);
  const [showMarkInactive, setShowMarkInactive] = useState(false);
  const [showEditOffer, setShowEditOffer] = useState(false);
  const [editingRound, setEditingRound] = useState<OfferRound | null>(null);
  const [showEditCoop, setShowEditCoop] = useState(false);

  const dealStatus = computeDealStatus(conditions);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddRound = (data: RoundFormData) => {
    const now = new Date().toISOString();
    const ts = Date.now();
    const irrevocableAt = `${data.irrevocableDate}T${data.irrevocableTime}:00`;
    const price = parsePriceInput(data.offerPrice);
    const deposit = data.depositAmount.trim() ? parsePriceInput(data.depositAmount) : undefined;

    const newRound: OfferRound = {
      id: `or-${genId()}`,
      leadId: lead.id,
      threadId: thread.id,
      propertyAddress: thread.propertyAddress,
      roundNumber: nextRoundNumber,
      direction: data.direction,
      offerPrice: price,
      irrevocableAt,
      ...(deposit !== undefined && { depositAmount: deposit }),
      status: "active",
      createdBy: currentAgent,
      createdAt: now,
      updatedAt: now,
    };

    addOfferRound(newRound);

    if (counteringRound) {
      updateOfferRound(counteringRound.id, { status: "countered", updatedAt: now });
      cancelRemindersBySourceId(`offer-expiry-${thread.id}-${counteringRound.id}`);
    }
    addReminder({
      id: `r-${ts}-irr`, leadId: lead.id, leadName: fullName(lead),
      title: `Irrevocable date — Round ${nextRoundNumber} · ${thread.propertyAddress}`,
      dueDate: new Date(new Date(irrevocableAt).getTime() - 60 * 60 * 1000).toISOString(),
      createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
      completed: false, priority: "high", sourceId: `offer-expiry-${thread.id}-${newRound.id}`,
    });

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `${DIRECTION_LABELS[data.direction]} — Round ${nextRoundNumber}`,
      description: `${fmtPrice(price)}, expires ${fmtOfferDT(irrevocableAt)}.${deposit ? ` Deposit: ${fmtPrice(deposit)}.` : ""} Property: ${thread.propertyAddress}.`,
      createdAt: now, createdBy: currentAgent,
    });

    setShowAddRound(false);
    setCounteringRound(null);
  };

  const handleAcceptRound = (round: OfferRound, data: AcceptOfferFormData) => {
    const now = new Date().toISOString();
    const ts = Date.now();
    const price = parsePriceInput(data.acceptedPrice);
    const nowMs = Date.now();

    const ao: AcceptedOffer = {
      id: `ao-${genId()}`, leadId: lead.id, offerRoundId: round.id,
      threadId: thread.id,
      acceptedPrice: price,
      depositDueAt: data.multipleInstallments ? (data.installments[0]?.dueDate ?? "") : data.depositDueAt,
      closingDate: data.closingDate,
      ...(data.titleSearchDate && { titleSearchDate: data.titleSearchDate }),
      ...(data.multipleInstallments && {
        depositInstallments: data.installments.map((inst, idx) => ({
          installmentNumber: idx + 1,
          amount: parsePriceInput(inst.amount),
          dueDate: inst.dueDate,
        })),
      }),
      createdBy: currentAgent, createdAt: now, updatedAt: now,
    };
    addAcceptedOffer(ao);
    updateOfferRound(round.id, { status: "accepted", updatedAt: now });
    cancelRemindersBySourceId(`offer-expiry-${thread.id}-${round.id}`);

    // Mark this thread accepted
    updateBuyerOfferThread(thread.id, { status: "accepted", updatedAt: now });

    // Conditions
    const savedConditions: OfferCondition[] = data.conditions.map((c, i) => {
      const oc: OfferCondition = {
        id: `oc-${ts}-${i}`, acceptedOfferId: ao.id,
        conditionType: c.conditionType,
        ...(c.conditionType === "other" && { conditionLabel: c.conditionLabel }),
        conditionDeadline: c.conditionDeadline,
        resolution: "pending",
        createdBy: currentAgent, createdAt: now, updatedAt: now,
      };
      addOfferCondition(oc);
      return oc;
    });

    // Deposit reminders
    cancelRemindersBySourceIdPrefix(`deposit-${thread.id}`);
    if (!data.multipleInstallments) {
      if (data.depositDueAt) {
        addReminder({
          id: `r-${ts}-dep`, leadId: lead.id, leadName: fullName(lead),
          title: `Deposit due — ${fmtPrice(price)} deal`,
          dueDate: new Date(`${data.depositDueAt}T09:00:00`).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `deposit-${thread.id}`,
        });
      }
    } else {
      data.installments.forEach((inst, idx) => {
        if (!inst.dueDate) return;
        const n = idx + 1;
        addReminder({
          id: `r-${ts}-dep-${n}`, leadId: lead.id, leadName: fullName(lead),
          title: `Deposit installment ${n} due — ${fullName(lead)}`,
          dueDate: new Date(`${inst.dueDate}T09:00:00`).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `deposit-${thread.id}-${n}`,
        });
      });
    }

    // Closing reminders
    cancelRemindersBySourceId(`offer-close-${ao.id}`);
    const closingMs = new Date(`${data.closingDate}T09:00:00`).getTime();
    for (const [days, pri] of [[14, "medium"], [7, "medium"], [2, "high"]] as [number, "medium" | "high"][]) {
      const dueMs = closingMs - days * 86_400_000;
      if (dueMs <= nowMs) continue;
      addReminder({
        id: `r-${ts}-cl-${days}`, leadId: lead.id, leadName: fullName(lead),
        title: `Closing in ${days} day${days === 1 ? "" : "s"} — ${data.closingDate}`,
        dueDate: new Date(dueMs).toISOString(),
        createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: pri, sourceId: `offer-close-${ao.id}`,
      });
    }

    // Final buyer inspection
    if (lead.leadType === "Buyer" || lead.leadType === "Investor" || !lead.leadType) {
      cancelRemindersBySourceIdPrefix(`buyer-inspection-${thread.id}`);
      const inspMs = closingMs - 2 * 86_400_000;
      if (inspMs > nowMs) {
        addReminder({
          id: `r-${ts}-insp`, leadId: lead.id, leadName: fullName(lead),
          title: `Final buyer inspection — ${fullName(lead)}`,
          dueDate: new Date(inspMs).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `buyer-inspection-${thread.id}`,
        });
      }
    }

    // Title search
    if (data.titleSearchDate) {
      cancelRemindersBySourceIdPrefix(`title-search-${thread.id}`);
      const tsMs = new Date(`${data.titleSearchDate}T09:00:00`).getTime() - 2 * 86_400_000;
      if (tsMs > nowMs) {
        addReminder({
          id: `r-${ts}-ts`, leadId: lead.id, leadName: fullName(lead),
          title: `Title search due — ${fullName(lead)}`,
          dueDate: new Date(tsMs).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `title-search-${thread.id}`,
        });
      }
    }

    // Condition reminders
    for (const [i, cond] of savedConditions.entries()) {
      cancelRemindersBySourceId(`condition-${cond.id}`);
      const label = cond.conditionType === "other" && cond.conditionLabel
        ? cond.conditionLabel : CONDITION_TYPE_LABELS[cond.conditionType];
      const dlMs = new Date(`${cond.conditionDeadline}T09:00:00`).getTime();
      const due2dMs = dlMs - 2 * 86_400_000;
      if (due2dMs > nowMs) {
        addReminder({
          id: `r-${ts}-cd2-${i}`, leadId: lead.id, leadName: fullName(lead),
          title: `${label} condition due in 2 days`,
          dueDate: new Date(due2dMs).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "medium", sourceId: `condition-${cond.id}`,
        });
      }
    }

    const depositSummary = data.multipleInstallments
      ? `${data.installments.length} deposit installments`
      : data.depositDueAt ? `Deposit due ${data.depositDueAt}` : "";

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Offer accepted — ${fmtPrice(price)}`,
      description: `Closing ${data.closingDate}. ${depositSummary}.${savedConditions.length > 0 ? ` ${savedConditions.length} condition${savedConditions.length > 1 ? "s" : ""} to resolve.` : " Firm — no conditions."}`.trim(),
      createdAt: now, createdBy: currentAgent,
    });

    if (savedConditions.length === 0) {
      onFirm(thread.id);
    }

    setAcceptingRound(null);
  };

  const handleRoundAction = (round: OfferRound, action: "reject" | "expired") => {
    const now = new Date().toISOString();
    const status = action === "reject" ? "rejected" : "expired";
    updateOfferRound(round.id, { status, updatedAt: now });
    // Cancel all reminders for this thread — deal is dead
    cancelRemindersBySourceIdPrefix(`offer-expiry-${thread.id}`);
    cancelRemindersBySourceIdPrefix(`deposit-${thread.id}`);
    cancelRemindersBySourceIdPrefix(`buyer-inspection-${thread.id}`);
    cancelRemindersBySourceIdPrefix(`title-search-${thread.id}`);
    // Mark thread inactive automatically
    updateBuyerOfferThread(thread.id, { status: "inactive", lossReason: status === "rejected" ? "Offer rejected by seller" : "Offer expired", updatedAt: now });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Offer inactive — ${thread.propertyAddress}`,
      description: `Round ${round.roundNumber} ${status}. All reminders cancelled.`,
      createdAt: now, createdBy: currentAgent,
    });
  };

  const handleResolveCondition = (cond: OfferCondition, resolution: "waived") => {
    const now = new Date().toISOString();
    updateOfferCondition(cond.id, { resolution, resolvedAt: now, updatedAt: now });
    cancelRemindersBySourceId(`condition-${cond.id}`);

    const label = cond.conditionType === "other" && cond.conditionLabel
      ? cond.conditionLabel : CONDITION_TYPE_LABELS[cond.conditionType];

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Condition waived — ${label}`,
      description: `${label} condition waived by ${currentAgent}.`,
      createdAt: now, createdBy: currentAgent,
    });

    const updatedConditions = conditions.map((c) =>
      c.id === cond.id ? { ...c, resolution, resolvedAt: now } : c
    );
    if (computeDealStatus(updatedConditions) === "firm") {
      onFirm(thread.id);
    }
  };

  const handleMarkInactive = (reason: string) => {
    const now = new Date().toISOString();
    updateBuyerOfferThread(thread.id, { status: "inactive", lossReason: reason, updatedAt: now });
    // Cancel all thread-scoped reminders
    cancelRemindersBySourceIdPrefix(`offer-expiry-${thread.id}`);
    cancelRemindersBySourceIdPrefix(`deposit-${thread.id}`);
    cancelRemindersBySourceIdPrefix(`title-search-${thread.id}`);
    cancelRemindersBySourceIdPrefix(`buyer-inspection-${thread.id}`);
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Offer inactive — ${thread.propertyAddress}`,
      description: `Reason: ${reason}.`,
      createdAt: now, createdBy: currentAgent,
    });
    setShowMarkInactive(false);
  };

  const handleEditAcceptedOffer = (data: AcceptOfferFormData) => {
    if (!acceptedOffer) return;
    const now = new Date().toISOString();
    const ts = Date.now();
    const price = parsePriceInput(data.acceptedPrice);
    const nowMs = Date.now();

    // Update the accepted offer record
    updateAcceptedOffer(acceptedOffer.id, {
      acceptedPrice: price,
      depositDueAt: data.multipleInstallments ? (data.installments[0]?.dueDate ?? "") : data.depositDueAt,
      closingDate: data.closingDate,
      titleSearchDate: data.titleSearchDate || undefined,
      ...(data.multipleInstallments && {
        depositInstallments: data.installments.map((inst, idx) => ({
          installmentNumber: idx + 1,
          amount: parsePriceInput(inst.amount),
          dueDate: inst.dueDate,
        })),
      }),
      ...(!data.multipleInstallments && { depositInstallments: undefined }),
      updatedAt: now,
    });

    // Recreate deposit reminders
    cancelRemindersBySourceIdPrefix(`deposit-${thread.id}`);
    if (!data.multipleInstallments) {
      if (data.depositDueAt) {
        addReminder({
          id: `r-${ts}-dep`, leadId: lead.id, leadName: fullName(lead),
          title: `Deposit due — ${fmtPrice(price)} deal`,
          dueDate: new Date(`${data.depositDueAt}T09:00:00`).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `deposit-${thread.id}`,
        });
      }
    } else {
      data.installments.forEach((inst, idx) => {
        if (!inst.dueDate) return;
        const n = idx + 1;
        addReminder({
          id: `r-${ts}-dep-${n}`, leadId: lead.id, leadName: fullName(lead),
          title: `Deposit installment ${n} due — ${fullName(lead)}`,
          dueDate: new Date(`${inst.dueDate}T09:00:00`).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `deposit-${thread.id}-${n}`,
        });
      });
    }

    // Recreate closing reminders
    cancelRemindersBySourceId(`offer-close-${acceptedOffer.id}`);
    const closingMs = new Date(`${data.closingDate}T09:00:00`).getTime();
    for (const [days, pri] of [[14, "medium"], [7, "medium"], [2, "high"]] as [number, "medium" | "high"][]) {
      const dueMs = closingMs - days * 86_400_000;
      if (dueMs <= nowMs) continue;
      addReminder({
        id: `r-${ts}-cl-${days}`, leadId: lead.id, leadName: fullName(lead),
        title: `Closing in ${days} day${days === 1 ? "" : "s"} — ${data.closingDate}`,
        dueDate: new Date(dueMs).toISOString(),
        createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: pri, sourceId: `offer-close-${acceptedOffer.id}`,
      });
    }

    // Recreate buyer inspection reminder
    cancelRemindersBySourceIdPrefix(`buyer-inspection-${thread.id}`);
    const inspMs = closingMs - 2 * 86_400_000;
    if (inspMs > nowMs) {
      addReminder({
        id: `r-${ts}-insp`, leadId: lead.id, leadName: fullName(lead),
        title: `Final buyer inspection — ${fullName(lead)}`,
        dueDate: new Date(inspMs).toISOString(),
        createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: "high", sourceId: `buyer-inspection-${thread.id}`,
      });
    }

    // Recreate title search reminder
    if (data.titleSearchDate) {
      cancelRemindersBySourceIdPrefix(`title-search-${thread.id}`);
      const tsMs = new Date(`${data.titleSearchDate}T09:00:00`).getTime() - 2 * 86_400_000;
      if (tsMs > nowMs) {
        addReminder({
          id: `r-${ts}-ts`, leadId: lead.id, leadName: fullName(lead),
          title: `Title search due — ${fullName(lead)}`,
          dueDate: new Date(tsMs).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `title-search-${thread.id}`,
        });
      }
    }

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Accepted offer updated — ${thread.propertyAddress}`,
      description: `Price: ${fmtPrice(price)}, closing ${data.closingDate}.`,
      createdAt: now, createdBy: currentAgent,
    });

    setShowEditOffer(false);
  };

  const handleReactivateRound = (round: OfferRound) => {
    const now = new Date().toISOString();
    updateOfferRound(round.id, { status: "active", updatedAt: now });
    if (thread.status === "inactive") {
      updateBuyerOfferThread(thread.id, { status: "active", lossReason: undefined, updatedAt: now });
    }
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Round ${round.roundNumber} reactivated — ${thread.propertyAddress}`,
      description: `${fmtPrice(round.offerPrice)} — reopened for re-negotiation.`,
      createdAt: now, createdBy: currentAgent,
    });
  };

  const handleEditRound = (round: OfferRound, data: EditRoundFormData) => {
    const now = new Date().toISOString();
    const price = parsePriceInput(data.offerPrice);
    const deposit = data.depositAmount.trim() ? parsePriceInput(data.depositAmount) : undefined;
    const irrevocableAt = `${data.irrevocableDate}T${data.irrevocableTime}:00`;

    const wasAccepted = round.status === "accepted";
    const becomesActive = data.status === "active" || data.status === "countered";

    // If unaccepting: remove accepted offer + cancel deposit/closing/condition reminders
    if (wasAccepted && data.status !== "accepted" && acceptedOffer) {
      removeAcceptedOffer(acceptedOffer.id);
      cancelRemindersBySourceIdPrefix(`deposit-${thread.id}`);
      cancelRemindersBySourceIdPrefix(`title-search-${thread.id}`);
      cancelRemindersBySourceIdPrefix(`buyer-inspection-${thread.id}`);
      cancelRemindersBySourceId(`offer-close-${acceptedOffer.id}`);
      conditions.forEach((c) => cancelRemindersBySourceId(`condition-${c.id}`));
    }

    updateOfferRound(round.id, {
      direction: data.direction,
      offerPrice: price,
      irrevocableAt,
      depositAmount: deposit,
      status: data.status,
      updatedAt: now,
    });

    // Update irrevocable reminder if round is active
    cancelRemindersBySourceId(`offer-expiry-${thread.id}-${round.id}`);
    if (data.status === "active") {
      addReminder({
        id: `r-${Date.now()}-irr`, leadId: lead.id, leadName: fullName(lead),
        title: `Irrevocable date — Round ${round.roundNumber} · ${thread.propertyAddress}`,
        dueDate: new Date(new Date(irrevocableAt).getTime() - 60 * 60 * 1000).toISOString(),
        createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: "high", sourceId: `offer-expiry-${thread.id}-${round.id}`,
      });
    }

    // Update thread status
    if (wasAccepted && !becomesActive) {
      updateBuyerOfferThread(thread.id, { status: "inactive", lossReason: data.status === "rejected" ? "Offer rejected" : "Offer expired", updatedAt: now });
    } else if (becomesActive && thread.status !== "active") {
      updateBuyerOfferThread(thread.id, { status: "active", lossReason: undefined, updatedAt: now });
    }

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Round ${round.roundNumber} edited — ${thread.propertyAddress}`,
      description: `${fmtPrice(price)}, status: ${data.status}.`,
      createdAt: now, createdBy: currentAgent,
    });

    setEditingRound(null);
  };

  const ss = THREAD_STATUS_STYLES[thread.status];

  return (
    <>
      <div className={cn("border border-zinc-200 rounded-xl overflow-hidden", thread.status === "inactive" && "opacity-60")}>
        {/* Thread header */}
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-zinc-50 hover:bg-zinc-100/70 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">{thread.propertyAddress}</p>
            {thread.mlsNumber && (
              <p className="text-xs text-zinc-400 mt-0.5">MLS# {thread.mlsNumber}</p>
            )}
            {thread.lossReason && (
              <p className="text-xs text-zinc-500 mt-0.5">Reason: {thread.lossReason}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", ss.cls)}>{ss.label}</span>
            <span className="text-zinc-400 text-xs">{expanded ? "▲" : "▼"}</span>
          </div>
        </button>

        {/* Thread body */}
        {expanded && (
          <div className="px-4 py-3 space-y-3 border-t border-zinc-100">
            {/* Round list */}
            {displayRounds.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-2">No rounds logged yet.</p>
            ) : (
              <div className="space-y-2">
                {displayRounds.map((round) => {
                  const rs = ROUND_STATUS_STYLES[round.status];
                  const roundActive = round.status === "active";
                  return (
                    <div key={round.id} className={cn("rounded-xl border px-3 py-2.5", roundActive ? "border-blue-200 bg-blue-50/30" : "border-zinc-100")}>
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-zinc-500">Round {round.roundNumber}</span>
                            <span className="text-zinc-200">·</span>
                            <span className="text-xs text-zinc-600">{DIRECTION_LABELS[round.direction]}</span>
                            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", rs.cls)}>{rs.label}</span>
                          </div>
                          <p className="text-base font-semibold text-zinc-900">{fmtPrice(round.offerPrice)}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">Expires {fmtOfferDT(round.irrevocableAt)}</p>
                          {round.depositAmount !== undefined && (
                            <p className="text-xs text-zinc-400 mt-0.5">Deposit: {fmtPrice(round.depositAmount)}</p>
                          )}
                        </div>
                        {roundActive && isActive && !acceptedOffer && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button type="button" onClick={() => setAcceptingRound(round)}
                              className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md px-2.5 py-1 hover:bg-emerald-50 transition-colors">
                              Accept
                            </button>
                            <button type="button"
                              onClick={() => { setCounteringRound(round); setShowAddRound(true); }}
                              className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                              Counter
                            </button>
                            <button type="button" onClick={() => handleRoundAction(round, "reject")}
                              className="text-xs text-red-500 border border-red-100 rounded-md px-2.5 py-1 hover:bg-red-50 transition-colors">
                              Reject
                            </button>
                            <button type="button" onClick={() => handleRoundAction(round, "expired")}
                              className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                              Expired
                            </button>
                            <button type="button" onClick={() => setEditingRound(round)}
                              className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                              Edit
                            </button>
                          </div>
                        )}
                        {(round.status === "rejected" || round.status === "expired") && !acceptedOffer && !hasActiveRound && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button type="button" onClick={() => handleReactivateRound(round)}
                              className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                              Reactivate
                            </button>
                            <button type="button" onClick={() => setEditingRound(round)}
                              className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                              Edit
                            </button>
                          </div>
                        )}
                        {(round.status === "countered" || round.status === "accepted") && (
                          <button type="button" onClick={() => setEditingRound(round)}
                            className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors shrink-0 self-start">
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Accepted offer details */}
            {isAccepted && acceptedOffer && (() => {
              const ds = DEAL_STATUS_STYLES[dealStatus];
              return (
                <div className="border border-zinc-100 rounded-xl px-3 py-3 space-y-3 bg-zinc-50/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Accepted Offer</p>
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", ds.cls)}>{ds.label}</span>
                    </div>
                    <button type="button" onClick={() => setShowEditOffer(true)}
                      className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors shrink-0">
                      Edit
                    </button>
                  </div>
                  {dealStatus === "fell_through" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-red-800">Condition deadline passed</p>
                    </div>
                  )}
                  <dl className="grid grid-cols-3 gap-3">
                    <div>
                      <dt className="text-xs text-zinc-400">Price</dt>
                      <dd className="text-sm font-semibold text-zinc-900 mt-0.5">{fmtPrice(acceptedOffer.acceptedPrice)}</dd>
                    </div>
                    <div className={acceptedOffer.depositInstallments && acceptedOffer.depositInstallments.length > 1 ? "col-span-2" : ""}>
                      <dt className="text-xs text-zinc-400">Deposit</dt>
                      {acceptedOffer.depositInstallments && acceptedOffer.depositInstallments.length > 1 ? (
                        <dd className="mt-0.5 space-y-0.5">
                          {acceptedOffer.depositInstallments.map((inst) => (
                            <p key={inst.installmentNumber} className="text-xs font-medium text-zinc-800">
                              #{inst.installmentNumber}: {fmtPrice(inst.amount)} — {formatDate(new Date(`${inst.dueDate}T12:00:00`).toISOString())}
                            </p>
                          ))}
                        </dd>
                      ) : (
                        <dd className="text-sm font-medium text-zinc-800 mt-0.5">
                          {formatDate(new Date(`${acceptedOffer.depositDueAt}T12:00:00`).toISOString())}
                        </dd>
                      )}
                    </div>
                    {(!acceptedOffer.depositInstallments || acceptedOffer.depositInstallments.length <= 1) && (
                      <div>
                        <dt className="text-xs text-zinc-400">Closing</dt>
                        <dd className="text-sm font-medium text-zinc-800 mt-0.5">
                          {formatDate(new Date(`${acceptedOffer.closingDate}T12:00:00`).toISOString())}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {acceptedOffer.depositInstallments && acceptedOffer.depositInstallments.length > 1 && (
                    <div>
                      <dt className="text-xs text-zinc-400">Closing</dt>
                      <dd className="text-sm font-medium text-zinc-800 mt-0.5">
                        {formatDate(new Date(`${acceptedOffer.closingDate}T12:00:00`).toISOString())}
                      </dd>
                    </div>
                  )}
                  {conditions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Conditions</p>
                      {conditions.map((cond) => {
                        const label = cond.conditionType === "other" && cond.conditionLabel
                          ? cond.conditionLabel : CONDITION_TYPE_LABELS[cond.conditionType];
                        const isPending = cond.resolution === "pending";
                        const overdue = isPending && new Date(`${cond.conditionDeadline}T23:59:59`) < new Date();
                        return (
                          <div key={cond.id} className={cn(
                            "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                            overdue ? "border-red-200 bg-red-50/40"
                              : isPending ? "border-amber-200 bg-amber-50/30"
                              : "border-zinc-100 bg-zinc-50"
                          )}>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-medium", overdue ? "text-red-800" : isPending ? "text-zinc-800" : "text-zinc-500 line-through")}>{label}</p>
                              <p className="text-xs text-zinc-400 mt-0.5">Deadline: {formatDate(new Date(`${cond.conditionDeadline}T12:00:00`).toISOString())} {overdue && <span className="text-red-600 font-medium">· Overdue</span>}</p>
                              {!isPending && cond.resolvedAt && (
                                <p className="text-xs text-zinc-400 mt-0.5 capitalize">{cond.resolution} — {formatDate(cond.resolvedAt)}</p>
                              )}
                            </div>
                            {isPending ? (
                              <button type="button" onClick={() => handleResolveCondition(cond, "waived")}
                                className="text-xs text-zinc-700 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors shrink-0">
                                Waive
                              </button>
                            ) : (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 shrink-0 capitalize">{cond.resolution}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {conditions.length === 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-emerald-800">No conditions — deal is firm.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Thread action buttons */}
            {isActive && !acceptedOffer && (
              <div className="flex items-center gap-2 pt-1">
                <button type="button"
                  onClick={() => { setCounteringRound(null); setShowAddRound(true); }}
                  className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors">
                  + Add Round
                </button>
                <button type="button"
                  onClick={() => setShowMarkInactive(true)}
                  className="text-xs text-zinc-500 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors">
                  Mark Inactive
                </button>
              </div>
            )}
          </div>
        )}
        <CoopAgentRow
          label="Listing Agent"
          firstName={thread.coopAgentFirstName}
          lastName={thread.coopAgentLastName}
          mobile={thread.coopAgentMobile}
          brokerage={thread.coopAgentBrokerage}
          onEdit={() => setShowEditCoop(true)}
        />
      </div>

      {/* Modals */}
      {showAddRound && (
        <AddRoundModal
          nextRoundNumber={nextRoundNumber}
          prefill={counteringRound ?? undefined}
          onClose={() => { setShowAddRound(false); setCounteringRound(null); }}
          onSubmit={handleAddRound}
        />
      )}
      {acceptingRound && (
        <ConfirmAcceptanceModal
          round={acceptingRound}
          onClose={() => setAcceptingRound(null)}
          onSubmit={(data) => handleAcceptRound(acceptingRound, data)}
        />
      )}
      {showMarkInactive && (
        <MarkInactiveModal
          onClose={() => setShowMarkInactive(false)}
          onSubmit={handleMarkInactive}
        />
      )}
      {showEditOffer && acceptedOffer && (
        <EditAcceptedOfferModal
          acceptedOffer={acceptedOffer}
          onClose={() => setShowEditOffer(false)}
          onSubmit={handleEditAcceptedOffer}
        />
      )}
      {editingRound && (
        <EditRoundModal
          round={editingRound}
          onClose={() => setEditingRound(null)}
          onSubmit={(data) => handleEditRound(editingRound, data)}
        />
      )}
      {showEditCoop && (
        <EditCoopAgentModal
          label="Listing Agent"
          initialData={thread}
          onClose={() => setShowEditCoop(false)}
          onSubmit={(data) => {
            const now = new Date().toISOString();
            updateBuyerOfferThread(thread.id, { ...data, updatedAt: now });
            setShowEditCoop(false);
          }}
        />
      )}
    </>
  );
}

// ── Main OfferPanel ───────────────────────────────────────────────────────────

export function OfferPanel({
  lead, onFirm, historyOnly = false,
  buyerOfferThreads: allBuyerOfferThreads,
  onAddBuyerOfferThread, onUpdateBuyerOfferThread,
}: {
  lead: Lead;
  onFirm: (threadId: string) => void;
  historyOnly?: boolean;
  buyerOfferThreads: BuyerOfferThread[];
  onAddBuyerOfferThread: (thread: BuyerOfferThread) => void;
  onUpdateBuyerOfferThread: (id: string, patch: Partial<BuyerOfferThread>) => void;
}) {
  const {
    offerRounds, acceptedOffers, offerConditions,
    addOfferRound, updateOfferRound,
    addAcceptedOffer, updateAcceptedOffer, removeAcceptedOffer,
    addOfferCondition, updateOfferCondition,
    addActivity, addReminder, cancelRemindersBySourceId, cancelRemindersBySourceIdPrefix,
    updateLead,
  } = useStore();
  const { role } = useRole();
  const currentAgent = role === "agent" ? AGENT_NAME : MANAGER_NAME;

  const THREAD_SORT_ORDER: Record<BuyerOfferThreadStatus, number> = { active: 0, accepted: 1, inactive: 2 };
  const leadThreads = allBuyerOfferThreads
    .filter((t) => t.leadId === lead.id)
    .sort((a, b) =>
      THREAD_SORT_ORDER[a.status] - THREAD_SORT_ORDER[b.status] ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const allLeadRounds = offerRounds.filter((r) => r.leadId === lead.id);
  const acceptedOffer = acceptedOffers.find((ao) => ao.leadId === lead.id);
  const conditions = acceptedOffer
    ? offerConditions.filter((c) => c.acceptedOfferId === acceptedOffer.id)
    : [];

  const [showNewOffer, setShowNewOffer] = useState(false);

  const handleNewOffer = (address: string, mlsNumber: string, coopFirst: string, coopLast: string, coopMobile: string, coopBrokerage: string) => {
    const now = new Date().toISOString();
    const newThread: BuyerOfferThread = {
      id: `bot-${genId()}`,
      leadId: lead.id,
      propertyAddress: address,
      ...(mlsNumber && { mlsNumber }),
      ...(coopFirst    && { coopAgentFirstName: coopFirst }),
      ...(coopLast     && { coopAgentLastName:  coopLast }),
      ...(coopMobile   && { coopAgentMobile:    coopMobile }),
      ...(coopBrokerage && { coopAgentBrokerage: coopBrokerage }),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    onAddBuyerOfferThread(newThread);
    setShowNewOffer(false);
  };

  // Wrap onFirm to also advance lead to Under Contract
  const handleFirm = (threadId: string) => {
    const now = new Date().toISOString();
    updateLead(lead.id, { stage: "Under Contract", updatedAt: now });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
      title: `Deal firm — advanced to ${getStageDisplayName("Under Contract", lead.leadType)}`,
      description: "No conditions on accepted offer. Lead automatically advanced.",
      createdAt: now, createdBy: currentAgent,
    });
    onFirm(threadId);
  };

  // ── historyOnly view ─────────────────────────────────────────────────────

  if (historyOnly) {
    const inactiveThreads = leadThreads.filter((t) => t.status === "inactive");
    if (inactiveThreads.length === 0) return null;
    return (
      <Card padding="none">
        <div className="px-5 pt-3 pb-2 border-b border-zinc-100">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Previous Offer History</p>
        </div>
        <div className="divide-y divide-zinc-100">
          {inactiveThreads.map((thread) => {
            const rounds = allLeadRounds.filter((r) => r.threadId === thread.id);
            const prices = rounds.map((r) => r.offerPrice);
            const lo = prices.length ? Math.min(...prices) : 0;
            const hi = prices.length ? Math.max(...prices) : 0;
            return (
              <div key={thread.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-700 truncate">{thread.propertyAddress}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-zinc-400">{rounds.length} round{rounds.length !== 1 ? "s" : ""}</span>
                      {prices.length > 0 && (
                        <>
                          <span className="text-zinc-200">·</span>
                          <span className="text-xs text-zinc-500">
                            {lo === hi ? fmtPrice(lo) : `${fmtPrice(lo)} – ${fmtPrice(hi)}`}
                          </span>
                        </>
                      )}
                    </div>
                    {thread.lossReason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {thread.lossReason}</p>
                    )}
                  </div>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5", THREAD_STATUS_STYLES["inactive"].cls)}>
                    Inactive
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // ── Full offer panel ─────────────────────────────────────────────────────

  return (
    <>
      <Card padding="none">
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Offers</h2>
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{leadThreads.length}</span>
          </div>
        </div>

        {leadThreads.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-zinc-400">No offers yet.</p>
            <p className="text-xs text-zinc-300 mt-1">Click &ldquo;+ New Offer&rdquo; to start an offer on a property.</p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-3">
            {leadThreads.map((thread) => {
              const threadRounds = allLeadRounds
                .filter((r) => r.threadId === thread.id)
                .sort((a, b) => a.roundNumber - b.roundNumber);
              const threadAcceptedOffer = thread.status === "accepted" ? acceptedOffer : undefined;
              const threadConditions = threadAcceptedOffer ? conditions : [];
              return (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  rounds={threadRounds}
                  acceptedOffer={threadAcceptedOffer}
                  conditions={threadConditions}
                  lead={lead}
                  currentAgent={currentAgent}
                  onFirm={handleFirm}
                  addOfferRound={addOfferRound}
                  updateOfferRound={updateOfferRound}
                  addAcceptedOffer={addAcceptedOffer}
                  updateAcceptedOffer={updateAcceptedOffer}
                  removeAcceptedOffer={removeAcceptedOffer}
                  addOfferCondition={addOfferCondition}
                  updateOfferCondition={updateOfferCondition}
                  addActivity={addActivity}
                  addReminder={addReminder}
                  cancelRemindersBySourceId={cancelRemindersBySourceId}
                  cancelRemindersBySourceIdPrefix={cancelRemindersBySourceIdPrefix}
                  updateBuyerOfferThread={onUpdateBuyerOfferThread}
                />
              );
            })}
          </div>
        )}

        {/* + New Offer button — always available so agents can start on a new property */}
        <div className="px-4 pb-4 pt-1">
          <button type="button"
            onClick={() => setShowNewOffer(true)}
            className="w-full text-sm font-medium text-zinc-900 border border-dashed border-zinc-300 rounded-xl py-2.5 hover:bg-zinc-50 transition-colors">
            + New Offer
          </button>
        </div>
      </Card>

      {showNewOffer && (
        <NewOfferModal
          onClose={() => setShowNewOffer(false)}
          onSubmit={handleNewOffer}
        />
      )}
    </>
  );
}
