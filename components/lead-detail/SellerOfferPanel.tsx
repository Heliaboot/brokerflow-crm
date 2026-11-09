"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn, genId, formatDate } from "@/lib/utils";
import { fullName } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useRole, AGENT_NAME, MANAGER_NAME } from "@/lib/role-context";
import { getStageDisplayName, CONDITION_TYPE_LABELS } from "@/lib/constants";
import { ConfirmAcceptanceModal, EditAcceptedOfferModal, AcceptOfferFormData } from "./OfferPanel";
import { CoopAgentRow, CoopAgentSection } from "./CoopAgentRow";
import type {
  Lead,
  SellerOfferThread,
  SellerOfferRound,
  SellerOfferStatus,
  OfferDirection,
  OfferRoundStatus,
  AcceptedOffer,
  OfferCondition,
} from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtPrice = (n: number) =>
  `$${n.toLocaleString("en-CA")}`;

const fmtDateTime = (dt: string) =>
  new Date(dt).toLocaleString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

const parsePriceInput = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

function computeDealStatus(conditions: Pick<OfferCondition, "resolution" | "conditionDeadline">[]): "conditional" | "firm" | "fell_through" {
  if (conditions.length === 0) return "firm";
  const now = new Date();
  if (conditions.some((c) => c.resolution === "pending" && new Date(`${c.conditionDeadline}T23:59:59`) < now))
    return "fell_through";
  if (conditions.every((c) => c.resolution !== "pending")) return "firm";
  return "conditional";
}

const STATUS_STYLES: Record<SellerOfferStatus, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-blue-100 text-blue-800" },
  countered: { label: "Countered", cls: "bg-amber-100 text-amber-800" },
  accepted:  { label: "Accepted",  cls: "bg-emerald-100 text-emerald-800" },
  rejected:  { label: "Rejected",  cls: "bg-red-100 text-red-700" },
  withdrawn: { label: "Withdrawn", cls: "bg-zinc-100 text-zinc-500" },
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

// ── Log New Offer Modal ───────────────────────────────────────────────────────

interface LogOfferData {
  buyerLabel: string;
  offerPrice: string;
  irrevocableDate: string;
  irrevocableTime: string;
  depositAmount: string;
  coopAgentFirstName?: string;
  coopAgentLastName?: string;
  coopAgentMobile?: string;
  coopAgentBrokerage?: string;
}

function LogOfferModal({
  offerNumber, coopLabel, onClose, onSubmit,
}: {
  offerNumber: number;
  coopLabel: string;
  onClose: () => void;
  onSubmit: (data: LogOfferData) => void;
}) {
  const [buyerLabel, setBuyerLabel] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [irrevocableDate, setIrrevocableDate] = useState("");
  const [irrevocableTime, setIrrevocableTime] = useState("21:00");
  const [depositAmount, setDepositAmount] = useState("");
  const [coopFirst, setCoopFirst]         = useState("");
  const [coopLast, setCoopLast]           = useState("");
  const [coopMobile, setCoopMobile]       = useState("");
  const [coopBrokerage, setCoopBrokerage] = useState("");

  const canSubmit = offerPrice.trim().length > 0 && irrevocableDate.length > 0 && parsePriceInput(offerPrice) > 0;

  return (
    <Modal title={`Log Offer Received — Offer ${offerNumber}`} onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Log Offer" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ buyerLabel, offerPrice, irrevocableDate, irrevocableTime, depositAmount, coopAgentFirstName: coopFirst || undefined, coopAgentLastName: coopLast || undefined, coopAgentMobile: coopMobile || undefined, coopAgentBrokerage: coopBrokerage || undefined }); }} /></>}>
      <div>
        <label className={fl}>Buyer / Agent <span className="normal-case text-zinc-400 font-normal">(optional — e.g. &quot;John Smith&quot; or &quot;Buyer A&quot;)</span></label>
        <input type="text" value={buyerLabel} onChange={(e) => setBuyerLabel(e.target.value)}
          placeholder={`Offer ${offerNumber}`} className={fi} autoFocus />
      </div>
      <div>
        <label className={fl}>Offer Price <span className="text-red-400">*</span></label>
        <input type="text" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)}
          placeholder="e.g. 560000" className={fi} />
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
        <label className={fl}>Deposit <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="e.g. 50000" className={fi} />
      </div>
      <CoopAgentSection
        label={coopLabel}
        firstName={coopFirst} setFirstName={setCoopFirst}
        lastName={coopLast}   setLastName={setCoopLast}
        mobile={coopMobile}   setMobile={setCoopMobile}
        brokerage={coopBrokerage} setBrokerage={setCoopBrokerage}
      />
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
        <p className="text-xs text-zinc-400">· Offer received from {buyerLabel.trim() || `Buyer ${offerNumber}`}</p>
        <p className="text-xs text-zinc-400">· Reminder 1 hour before offer expires</p>
      </div>
    </Modal>
  );
}

// ── Counter Offer Modal ───────────────────────────────────────────────────────

interface CounterData {
  counterPrice: string;
  irrevocableDate: string;
  irrevocableTime: string;
  isBuyerResponse: boolean; // true = logging buyer's counter-back, false = seller counter
}

function CounterModal({
  thread, currentPrice, isBuyerResponse, onClose, onSubmit,
}: {
  thread: SellerOfferThread;
  currentPrice: number;
  isBuyerResponse: boolean;
  onClose: () => void;
  onSubmit: (data: CounterData) => void;
}) {
  const [counterPrice, setCounterPrice] = useState(String(currentPrice));
  const [irrevocableDate, setIrrevocableDate] = useState("");
  const [irrevocableTime, setIrrevocableTime] = useState("21:00");

  const canSubmit = counterPrice.trim().length > 0 && irrevocableDate.length > 0 && parsePriceInput(counterPrice) > 0;
  const label = thread.buyerLabel || `Offer ${thread.id.slice(-4)}`;
  const title = isBuyerResponse ? `Log Buyer Counter — ${label}` : `Counter Offer — ${label}`;
  const btnLabel = isBuyerResponse ? "Log Buyer Counter" : "Send Counter";

  return (
    <Modal title={title} onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label={btnLabel} disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ counterPrice, irrevocableDate, irrevocableTime, isBuyerResponse }); }} /></>}>
      {!isBuyerResponse && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800">Current offer: <strong>{fmtPrice(currentPrice)}</strong> — enter your counter price below.</p>
        </div>
      )}
      <div>
        <label className={fl}>{isBuyerResponse ? "Buyer's Counter Price" : "Counter Price"} <span className="text-red-400">*</span></label>
        <input type="text" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)}
          placeholder="e.g. 575000" className={fi} autoFocus />
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
    </Modal>
  );
}

// ── Edit Round Modal ──────────────────────────────────────────────────────────

const SELLER_DIRECTION_OPTIONS: { value: OfferDirection; label: string }[] = [
  { value: "buyer_submitted", label: "Buyer submitted" },
  { value: "seller_counter",  label: "Seller counter" },
  { value: "buyer_counter",   label: "Buyer counter" },
];

const fs = `${fi} appearance-none`;

function EditSellerRoundModal({
  round, coopLabel, onClose, onSubmit,
}: {
  round: SellerOfferRound;
  coopLabel: string;
  onClose: () => void;
  onSubmit: (data: { direction: OfferDirection; offerPrice: string; irrevocableDate: string; irrevocableTime: string; depositAmount: string; status: OfferRoundStatus; coopAgentFirstName: string; coopAgentLastName: string; coopAgentMobile: string; coopAgentBrokerage: string }) => void;
}) {
  const [direction, setDirection] = useState<OfferDirection>(round.direction);
  const [offerPrice, setOfferPrice] = useState(String(round.offerPrice));
  const irrDt = new Date(round.irrevocableAt);
  const [irrevocableDate, setIrrevocableDate] = useState(irrDt.toISOString().slice(0, 10));
  const [irrevocableTime, setIrrevocableTime] = useState(irrDt.toTimeString().slice(0, 5));
  const [depositAmount, setDepositAmount] = useState(round.depositAmount ? String(round.depositAmount) : "");
  const [status, setStatus] = useState<OfferRoundStatus>(round.status as OfferRoundStatus);
  const [coopFirst, setCoopFirst]       = useState(round.coopAgentFirstName ?? "");
  const [coopLast, setCoopLast]         = useState(round.coopAgentLastName ?? "");
  const [coopMobile, setCoopMobile]     = useState(round.coopAgentMobile ?? "");
  const [coopBrokerage, setCoopBrokerage] = useState(round.coopAgentBrokerage ?? "");

  const statusOptions: { value: OfferRoundStatus; label: string }[] = [
    { value: "active",    label: "Active" },
    { value: "countered", label: "Countered" },
    { value: "rejected",  label: "Rejected" },
    { value: "expired",   label: "Expired" },
  ];
  if (round.status === "accepted") {
    statusOptions.unshift({ value: "accepted", label: "Accepted" });
  }

  const canSubmit = offerPrice.trim().length > 0 && irrevocableDate.length > 0 && parsePriceInput(offerPrice) > 0;

  return (
    <Modal title={`Edit Round ${round.roundNumber}`} onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Save Changes" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ direction, offerPrice, irrevocableDate, irrevocableTime, depositAmount, status, coopAgentFirstName: coopFirst, coopAgentLastName: coopLast, coopAgentMobile: coopMobile, coopAgentBrokerage: coopBrokerage }); }} /></>}>
      <div>
        <label className={fl}>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as OfferRoundStatus)} className={fs}>
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {round.status === "accepted" && status !== "accepted" && (
          <p className="text-xs text-amber-600 mt-1.5">⚠ Changing from Accepted will void the accepted offer and all related reminders.</p>
        )}
      </div>
      <div>
        <label className={fl}>Direction</label>
        <select value={direction} onChange={(e) => setDirection(e.target.value as OfferDirection)} className={fs}>
          {SELLER_DIRECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
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
        <label className={fl}>Deposit <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="e.g. 50000" className={fi} />
      </div>
      <CoopAgentSection
        label={coopLabel}
        firstName={coopFirst} setFirstName={setCoopFirst}
        lastName={coopLast}   setLastName={setCoopLast}
        mobile={coopMobile}   setMobile={setCoopMobile}
        brokerage={coopBrokerage} setBrokerage={setCoopBrokerage}
      />
    </Modal>
  );
}

// ── Main SellerOfferPanel ─────────────────────────────────────────────────────

export function SellerOfferPanel({ lead, onFirm }: { lead: Lead; onFirm: (threadId: string) => void }) {
  const {
    sellerOfferThreads, sellerOfferRounds,
    addSellerOfferThread, updateSellerOfferThread,
    addSellerOfferRound, updateSellerOfferRound,
    acceptedOffers, offerConditions,
    addAcceptedOffer, updateAcceptedOffer, removeAcceptedOffer,
    addOfferCondition, updateOfferCondition,
    addActivity, addReminder, cancelRemindersBySourceId, cancelRemindersBySourceIdPrefix,
    updateLead,
  } = useStore();
  const { role } = useRole();
  const currentAgent = role === "agent" ? AGENT_NAME : MANAGER_NAME;

  const roundsForThread = (threadId: string) =>
    sellerOfferRounds
      .filter((r) => r.threadId === threadId)
      .sort((a, b) => a.roundNumber - b.roundNumber);

  const latestRound = (threadId: string) => {
    const rounds = roundsForThread(threadId);
    return rounds[rounds.length - 1] ?? null;
  };

  const THREAD_STATUS_ORDER: Record<SellerOfferStatus, number> = {
    accepted: 0,
    active: 1,
    countered: 2,
    rejected: 3,
    withdrawn: 4,
  };

  const threads = sellerOfferThreads
    .filter((t) => t.leadId === lead.id)
    .sort((a, b) => {
      // Primary: status group (accepted → active → countered → rejected → withdrawn)
      const statusDiff = THREAD_STATUS_ORDER[a.status] - THREAD_STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      // Secondary: highest price first within the same status group
      const priceA = latestRound(a.id)?.offerPrice ?? 0;
      const priceB = latestRound(b.id)?.offerPrice ?? 0;
      return priceB - priceA;
    });

  const acceptedOffer = acceptedOffers.find((ao) => ao.leadId === lead.id);
  const conditions = acceptedOffer
    ? offerConditions.filter((c) => c.acceptedOfferId === acceptedOffer.id)
    : [];
  const dealStatus = computeDealStatus(conditions);

  const nextOfferNumber = threads.length + 1;

  // Auto-open the log form the first time this panel appears (no offers yet)
  const [showLogOffer, setShowLogOffer] = useState(() => threads.length === 0);
  const [counteringThread, setCounteringThread] = useState<{ thread: SellerOfferThread; isBuyerResponse: boolean } | null>(null);
  const [acceptingThread, setAcceptingThread] = useState<SellerOfferThread | null>(null);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [editingRoundThread, setEditingRoundThread] = useState<{ thread: SellerOfferThread; round: SellerOfferRound } | null>(null);
  const [showEditOffer, setShowEditOffer] = useState(false);

  const toggleExpand = (id: string) =>
    setExpandedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLogOffer = (data: LogOfferData) => {
    const now = new Date().toISOString();
    const price = parsePriceInput(data.offerPrice);
    const deposit = data.depositAmount.trim() ? parsePriceInput(data.depositAmount) : undefined;
    const irrevocableAt = `${data.irrevocableDate}T${data.irrevocableTime}:00`;
    const label = data.buyerLabel.trim() || `Offer ${nextOfferNumber}`;

    const thread: SellerOfferThread = {
      id: `sot-${genId()}`,
      leadId: lead.id,
      buyerLabel: label,
      status: "active",
      createdBy: currentAgent,
      createdAt: now,
      updatedAt: now,
    };
    addSellerOfferThread(thread);

    const round: SellerOfferRound = {
      id: `sor-${genId()}`,
      threadId: thread.id,
      leadId: lead.id,
      roundNumber: 1,
      direction: "buyer_submitted",
      offerPrice: price,
      irrevocableAt,
      ...(deposit !== undefined && { depositAmount: deposit }),
      ...(data.coopAgentFirstName && { coopAgentFirstName: data.coopAgentFirstName }),
      ...(data.coopAgentLastName  && { coopAgentLastName:  data.coopAgentLastName }),
      ...(data.coopAgentMobile    && { coopAgentMobile:    data.coopAgentMobile }),
      ...(data.coopAgentBrokerage && { coopAgentBrokerage: data.coopAgentBrokerage }),
      status: "active",
      createdBy: currentAgent,
      createdAt: now,
      updatedAt: now,
    };
    addSellerOfferRound(round);

    // Irrevocable reminder 1h before
    cancelRemindersBySourceId(`sot-irr-${round.id}`);
    addReminder({
      id: `r-${genId()}`, leadId: lead.id, leadName: fullName(lead),
      title: `Irrevocable date — ${label}`,
      dueDate: new Date(new Date(irrevocableAt).getTime() - 60 * 60 * 1000).toISOString(),
      createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
      completed: false, priority: "high", sourceId: `sot-irr-${round.id}`,
    });

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Offer received — ${label}`,
      description: `${fmtPrice(price)}, expires ${fmtDateTime(irrevocableAt)}.${deposit ? ` Deposit: ${fmtPrice(deposit)}.` : ""}`,
      createdAt: now, createdBy: currentAgent,
    });
    setShowLogOffer(false);
  };

  const handleCounter = (thread: SellerOfferThread, data: CounterData) => {
    const now = new Date().toISOString();
    const price = parsePriceInput(data.counterPrice);
    const irrevocableAt = `${data.irrevocableDate}T${data.irrevocableTime}:00`;
    const label = thread.buyerLabel || `Offer ${thread.id.slice(-4)}`;
    const currentRounds = roundsForThread(thread.id);
    const prevRound = currentRounds[currentRounds.length - 1];
    const direction = data.isBuyerResponse ? "buyer_counter" : "seller_counter";

    // Mark previous round as countered
    if (prevRound) updateSellerOfferRound(prevRound.id, { status: "countered", updatedAt: now });
    cancelRemindersBySourceId(`sot-irr-${prevRound?.id}`);

    const newRound: SellerOfferRound = {
      id: `sor-${genId()}`,
      threadId: thread.id,
      leadId: lead.id,
      roundNumber: currentRounds.length + 1,
      direction,
      offerPrice: price,
      irrevocableAt,
      status: "active",
      createdBy: currentAgent,
      createdAt: now,
      updatedAt: now,
    };
    addSellerOfferRound(newRound);

    const newStatus: SellerOfferStatus = data.isBuyerResponse ? "active" : "countered";
    updateSellerOfferThread(thread.id, { status: newStatus, updatedAt: now });

    cancelRemindersBySourceId(`sot-irr-${newRound.id}`);
    addReminder({
      id: `r-${genId()}`, leadId: lead.id, leadName: fullName(lead),
      title: `${data.isBuyerResponse ? "Buyer counter" : "Counter offer"} expiry — ${label}`,
      dueDate: new Date(new Date(irrevocableAt).getTime() - 60 * 60 * 1000).toISOString(),
      createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
      completed: false, priority: "high", sourceId: `sot-irr-${newRound.id}`,
    });

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: data.isBuyerResponse ? `Buyer counter logged — ${label}` : `Counter offer sent — ${label}`,
      description: `${fmtPrice(price)}, expires ${fmtDateTime(irrevocableAt)}.`,
      createdAt: now, createdBy: currentAgent,
    });
    setCounteringThread(null);
  };

  const handleAcceptOffer = (thread: SellerOfferThread, data: AcceptOfferFormData) => {
    const now = new Date().toISOString();
    const price = parsePriceInput(data.acceptedPrice);
    const ts = genId();
    const label = thread.buyerLabel || `Offer ${thread.id.slice(-4)}`;

    // Mark this thread accepted, reject all other active threads
    updateSellerOfferThread(thread.id, { status: "accepted", updatedAt: now });
    const otherActive = threads.filter(
      (t) => t.id !== thread.id && (t.status === "active" || t.status === "countered")
    );
    otherActive.forEach((t) => {
      updateSellerOfferThread(t.id, { status: "rejected", updatedAt: now });
      const lr = latestRound(t.id);
      if (lr) {
        updateSellerOfferRound(lr.id, { status: "rejected", updatedAt: now });
        cancelRemindersBySourceId(`sot-irr-${lr.id}`);
      }
    });

    // Mark accepted round
    const lr = latestRound(thread.id);
    if (lr) {
      updateSellerOfferRound(lr.id, { status: "accepted", updatedAt: now });
      cancelRemindersBySourceId(`sot-irr-${lr.id}`);
    }

    // Create AcceptedOffer record (shared model)
    const ao: AcceptedOffer = {
      id: `ao-${genId()}`, leadId: lead.id, offerRoundId: lr?.id ?? thread.id,
      acceptedPrice: price, depositDueAt: data.depositDueAt, closingDate: data.closingDate,
      createdBy: currentAgent, createdAt: now, updatedAt: now,
    };
    addAcceptedOffer(ao);

    // Conditions
    const savedConditions = data.conditions.map((c, i) => {
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

    // Deposit reminder
    cancelRemindersBySourceId(`offer-dep-${ao.id}`);
    addReminder({
      id: `r-${ts}-dep`, leadId: lead.id, leadName: fullName(lead),
      title: `Deposit due — ${fmtPrice(price)} deal`,
      dueDate: new Date(`${data.depositDueAt}T09:00:00`).toISOString(),
      createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
      completed: false, priority: "high", sourceId: `offer-dep-${ao.id}`,
    });

    // Closing reminders — 14d, 7d, 1d
    const closingMs = new Date(`${data.closingDate}T09:00:00`).getTime();
    for (const days of [14, 7, 1]) {
      addReminder({
        id: `r-${ts}-cl-${days}`, leadId: lead.id, leadName: fullName(lead),
        title: `Closing in ${days} day${days === 1 ? "" : "s"} — ${data.closingDate}`,
        dueDate: new Date(closingMs - days * 86_400_000).toISOString(),
        createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: days === 1 ? "high" : "medium",
        sourceId: `offer-close-${ao.id}`,
      });
    }

    // Condition reminders
    savedConditions.forEach((cond, i) => {
      const condLabel = cond.conditionType === "other" && cond.conditionLabel
        ? cond.conditionLabel : CONDITION_TYPE_LABELS[cond.conditionType];
      const dlMs = new Date(`${cond.conditionDeadline}T09:00:00`).getTime();
      cancelRemindersBySourceId(`offer-cond-${cond.id}`);
      addReminder({
        id: `r-${ts}-cd2-${i}`, leadId: lead.id, leadName: fullName(lead),
        title: `${condLabel} condition due in 2 days`,
        dueDate: new Date(dlMs - 2 * 86_400_000).toISOString(),
        createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: "medium", sourceId: `offer-cond-${cond.id}`,
      });
      addReminder({
        id: `r-${ts}-cd0-${i}`, leadId: lead.id, leadName: fullName(lead),
        title: `${condLabel} condition due today`,
        dueDate: new Date(dlMs).toISOString(),
        createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: "high", sourceId: `offer-cond-${cond.id}`,
      });
    });

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Offer accepted — ${label}`,
      description: `Accepted at ${fmtPrice(price)}. Closing ${data.closingDate}.${otherActive.length > 0 ? ` ${otherActive.length} other offer${otherActive.length > 1 ? "s" : ""} rejected.` : ""}`,
      createdAt: now, createdBy: currentAgent,
    });

    if (savedConditions.length === 0) {
      updateLead(lead.id, { stage: "Under Contract", updatedAt: now });
      addActivity({
        id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
        title: `Deal firm — advanced to ${getStageDisplayName("Under Contract", lead.leadType)}`,
        description: "No conditions on accepted offer. Lead automatically advanced.",
        createdAt: now, createdBy: currentAgent,
      });
      onFirm(thread.id);
    }
    setAcceptingThread(null);
  };

  const handleReject = (thread: SellerOfferThread) => {
    const now = new Date().toISOString();
    const label = thread.buyerLabel || `Offer ${thread.id.slice(-4)}`;
    updateSellerOfferThread(thread.id, { status: "rejected", updatedAt: now });
    const lr = latestRound(thread.id);
    if (lr) {
      updateSellerOfferRound(lr.id, { status: "rejected", updatedAt: now });
      cancelRemindersBySourceId(`sot-irr-${lr.id}`);
    }
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Offer rejected — ${label}`,
      description: `Offer from ${label} rejected.`,
      createdAt: now, createdBy: currentAgent,
    });
    setConfirmRejectId(null);
  };

  const handleWithdraw = (thread: SellerOfferThread) => {
    const now = new Date().toISOString();
    const label = thread.buyerLabel || `Offer ${thread.id.slice(-4)}`;
    updateSellerOfferThread(thread.id, { status: "withdrawn", updatedAt: now });
    const lr = latestRound(thread.id);
    if (lr) {
      updateSellerOfferRound(lr.id, { status: "rejected", updatedAt: now });
      cancelRemindersBySourceId(`sot-irr-${lr.id}`);
    }
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Offer withdrawn — ${label}`,
      description: `${label} withdrew their offer.`,
      createdAt: now, createdBy: currentAgent,
    });
  };

  const handleEditRound = (thread: SellerOfferThread, round: SellerOfferRound, data: { direction: OfferDirection; offerPrice: string; irrevocableDate: string; irrevocableTime: string; depositAmount: string; status: OfferRoundStatus; coopAgentFirstName: string; coopAgentLastName: string; coopAgentMobile: string; coopAgentBrokerage: string }) => {
    const now = new Date().toISOString();
    const price = parsePriceInput(data.offerPrice);
    const deposit = data.depositAmount.trim() ? parsePriceInput(data.depositAmount) : undefined;
    const irrevocableAt = `${data.irrevocableDate}T${data.irrevocableTime}:00`;
    const label = thread.buyerLabel || `Offer ${thread.id.slice(-4)}`;
    const wasAccepted = round.status === "accepted";
    const becomesActive = data.status === "active" || data.status === "countered";

    // If unaccepting: remove accepted offer + cancel deposit/closing/condition reminders
    if (wasAccepted && data.status !== "accepted" && acceptedOffer) {
      removeAcceptedOffer(acceptedOffer.id);
      cancelRemindersBySourceIdPrefix(`deposit-${thread.id}`);
      cancelRemindersBySourceId(`offer-dep-${acceptedOffer.id}`);
      cancelRemindersBySourceId(`offer-close-${acceptedOffer.id}`);
      conditions.forEach((c) => cancelRemindersBySourceId(`offer-cond-${c.id}`));
    }

    updateSellerOfferRound(round.id, {
      direction: data.direction,
      offerPrice: price,
      irrevocableAt,
      ...(deposit !== undefined ? { depositAmount: deposit } : {}),
      status: data.status as SellerOfferRound["status"],
      coopAgentFirstName: data.coopAgentFirstName || undefined,
      coopAgentLastName: data.coopAgentLastName || undefined,
      coopAgentMobile: data.coopAgentMobile || undefined,
      coopAgentBrokerage: data.coopAgentBrokerage || undefined,
      updatedAt: now,
    });

    // Cancel old irrevocable reminder; recreate if round is now active
    cancelRemindersBySourceId(`sot-irr-${round.id}`);
    if (data.status === "active") {
      addReminder({
        id: `r-${genId()}-irr`, leadId: lead.id, leadName: fullName(lead),
        title: `Irrevocable date — ${label}`,
        dueDate: new Date(new Date(irrevocableAt).getTime() - 60 * 60 * 1000).toISOString(),
        createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
        completed: false, priority: "high", sourceId: `sot-irr-${round.id}`,
      });
    }

    // Update thread status
    if (wasAccepted && !becomesActive) {
      updateSellerOfferThread(thread.id, { status: data.status === "rejected" ? "rejected" : "withdrawn", updatedAt: now });
    } else if (becomesActive && thread.status !== "active" && thread.status !== "countered") {
      updateSellerOfferThread(thread.id, { status: data.status === "countered" ? "countered" : "active", updatedAt: now });
    } else if (data.status === "countered" && thread.status === "active") {
      updateSellerOfferThread(thread.id, { status: "countered", updatedAt: now });
    } else if (data.status === "active" && thread.status === "countered") {
      updateSellerOfferThread(thread.id, { status: "active", updatedAt: now });
    }

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Round ${round.roundNumber} edited — ${label}`,
      description: `${fmtPrice(price)}, status: ${data.status}.`,
      createdAt: now, createdBy: currentAgent,
    });
    setEditingRoundThread(null);
  };

  const handleEditAcceptedOffer = (data: AcceptOfferFormData) => {
    if (!acceptedOffer) return;
    const now = new Date().toISOString();
    const ts = genId();
    const price = parsePriceInput(data.acceptedPrice);
    const nowMs = new Date(now).getTime();
    const label = threads.find((t) => t.status === "accepted")?.buyerLabel || "Accepted Offer";

    updateAcceptedOffer(acceptedOffer.id, {
      acceptedPrice: price,
      depositDueAt: data.multipleInstallments ? (data.installments[0]?.dueDate ?? "") : data.depositDueAt,
      closingDate: data.closingDate,
      ...(data.multipleInstallments
        ? { depositInstallments: data.installments.map((inst, idx) => ({ installmentNumber: idx + 1, amount: parsePriceInput(inst.amount), dueDate: inst.dueDate })) }
        : { depositInstallments: undefined }),
      updatedAt: now,
    });

    // Recreate deposit reminders
    cancelRemindersBySourceId(`offer-dep-${acceptedOffer.id}`);
    cancelRemindersBySourceIdPrefix(`deposit-${acceptedOffer.id}`);
    if (!data.multipleInstallments) {
      if (data.depositDueAt) {
        addReminder({
          id: `r-${ts}-dep`, leadId: lead.id, leadName: fullName(lead),
          title: `Deposit due — ${fmtPrice(price)} deal`,
          dueDate: new Date(`${data.depositDueAt}T09:00:00`).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `offer-dep-${acceptedOffer.id}`,
        });
      }
    } else {
      data.installments.forEach((inst, idx) => {
        if (!inst.dueDate) return;
        addReminder({
          id: `r-${ts}-dep-${idx + 1}`, leadId: lead.id, leadName: fullName(lead),
          title: `Deposit installment ${idx + 1} due — ${fullName(lead)}`,
          dueDate: new Date(`${inst.dueDate}T09:00:00`).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `deposit-${acceptedOffer.id}-${idx + 1}`,
        });
      });
    }

    // Recreate closing reminders
    cancelRemindersBySourceId(`offer-close-${acceptedOffer.id}`);
    const closingMs = new Date(`${data.closingDate}T09:00:00`).getTime();
    for (const [days, pri] of [[14, "medium"], [7, "medium"], [1, "high"]] as [number, "medium" | "high"][]) {
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

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Accepted offer updated — ${label}`,
      description: `Price: ${fmtPrice(price)}, closing ${data.closingDate}.`,
      createdAt: now, createdBy: currentAgent,
    });
    setShowEditOffer(false);
  };

  const handleReactivate = (thread: SellerOfferThread) => {
    const now = new Date().toISOString();
    const label = thread.buyerLabel || `Offer ${thread.id.slice(-4)}`;
    const lr = latestRound(thread.id);
    updateSellerOfferThread(thread.id, { status: "active", updatedAt: now });
    if (lr) updateSellerOfferRound(lr.id, { status: "active", updatedAt: now });
    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Offer reactivated — ${label}`,
      description: `${label} reactivated for re-negotiation.`,
      createdAt: now, createdBy: currentAgent,
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const activeThreads   = threads.filter(t => t.status === "active" || t.status === "countered");
  const rejectedThreads = threads.filter(t => t.status === "rejected" || t.status === "withdrawn");

  const renderThread = (thread: SellerOfferThread, idx: number, dimmed = false) => {
    const rounds = roundsForThread(thread.id);
    const latest = rounds[rounds.length - 1];
    const isExpanded = expandedThreadIds.has(thread.id);
    const isActive = thread.status === "active" || thread.status === "countered";
    const ss = STATUS_STYLES[thread.status];
    const label = thread.buyerLabel || `Offer ${idx + 1}`;
    const isConfirmingReject = confirmRejectId === thread.id;

    return (
      <div key={thread.id} className={cn("px-5 py-4", dimmed && "opacity-55")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-medium text-zinc-900">{label}</span>
              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", ss.cls)}>
                {ss.label}
              </span>
            </div>
            {latest && (
              <>
                <p className="text-base font-semibold text-zinc-900">{fmtPrice(latest.offerPrice)}</p>
                {!dimmed && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {latest.direction === "seller_counter" ? "Your counter · " : latest.direction === "buyer_counter" ? "Buyer counter · " : ""}
                    Expires {fmtDateTime(latest.irrevocableAt)}
                  </p>
                )}
                {latest.depositAmount !== undefined && !dimmed && (
                  <p className="text-xs text-zinc-400 mt-0.5">Deposit: {fmtPrice(latest.depositAmount)}</p>
                )}
              </>
            )}
            {rounds.length > 1 && (
              <button type="button" onClick={() => toggleExpand(thread.id)}
                className="text-xs text-zinc-400 hover:text-zinc-700 mt-1 transition-colors">
                {isExpanded ? "Hide rounds" : `Show all ${rounds.length} rounds`}
              </button>
            )}
          </div>

          {isActive && !acceptedOffer && (
            <div className="flex flex-col gap-1.5 shrink-0">
              {isConfirmingReject ? (
                <>
                  <button type="button" onClick={() => handleReject(thread)}
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
                  <button type="button" onClick={() => setAcceptingThread(thread)}
                    className="text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md px-2.5 py-1 hover:bg-emerald-50 transition-colors">
                    Accept
                  </button>
                  {thread.status === "active" && (
                    <button type="button" onClick={() => setCounteringThread({ thread, isBuyerResponse: false })}
                      className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                      Counter
                    </button>
                  )}
                  {thread.status === "countered" && (
                    <button type="button" onClick={() => setCounteringThread({ thread, isBuyerResponse: true })}
                      className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                      Log Response
                    </button>
                  )}
                  <button type="button" onClick={() => setConfirmRejectId(thread.id)}
                    className="text-xs text-red-500 border border-red-100 rounded-md px-2.5 py-1 hover:bg-red-50 transition-colors">
                    Reject
                  </button>
                  <button type="button" onClick={() => handleWithdraw(thread)}
                    className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                    Withdrawn
                  </button>
                  {latest && (
                    <button type="button" onClick={() => setEditingRoundThread({ thread, round: latest })}
                      className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                      Edit
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {!isActive && (thread.status === "rejected" || thread.status === "withdrawn") && (
            <div className="flex flex-col gap-1.5 shrink-0">
              {!acceptedOffer && (
                <button type="button" onClick={() => handleReactivate(thread)}
                  className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                  Reactivate
                </button>
              )}
              {latest && (
                <button type="button" onClick={() => setEditingRoundThread({ thread, round: latest })}
                  className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                  Edit
                </button>
              )}
            </div>
          )}
          {thread.status === "accepted" && latest && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <button type="button" onClick={() => setEditingRoundThread({ thread, round: latest })}
                className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                Edit Round
              </button>
            </div>
          )}
        </div>

        {isExpanded && rounds.length > 1 && (
          <div className="mt-3 pl-4 border-l-2 border-zinc-100 space-y-2">
            {rounds.map((r, ri) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 shrink-0">Round {ri + 1}</span>
                <span className="text-xs text-zinc-500">
                  {r.direction === "buyer_submitted" ? "Buyer" : r.direction === "seller_counter" ? "Your counter" : "Buyer counter"}
                </span>
                <span className="text-xs font-medium text-zinc-800">{fmtPrice(r.offerPrice)}</span>
                <span className="text-xs text-zinc-300">·</span>
                <span className="text-xs text-zinc-400">{fmtDateTime(r.irrevocableAt)}</span>
                <button type="button" onClick={() => setEditingRoundThread({ thread, round: r })}
                  className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2 py-0.5 hover:bg-zinc-50 transition-colors ml-auto shrink-0">
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
        {latest && (
          <div className="-mx-5 -mb-4 mt-3">
            <CoopAgentRow
              label={lead.leadType === "Landlord" ? "Tenant's Agent" : "Buyer's Agent"}
              firstName={latest.coopAgentFirstName}
              lastName={latest.coopAgentLastName}
              mobile={latest.coopAgentMobile}
              brokerage={latest.coopAgentBrokerage}
              onEdit={() => setEditingRoundThread({ thread, round: latest })}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── Active Offers ─────────────────────────────────────────────────── */}
      <Card padding="none">
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Offers Received</h2>
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{threads.length}</span>
            {activeThreads.length > 0 && (
              <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {activeThreads.length} active
              </span>
            )}
          </div>
          {!acceptedOffer && (
            <button type="button" onClick={() => setShowLogOffer(true)}
              className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">
              + Log New Offer
            </button>
          )}
        </div>
        {threads.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-zinc-400">No offers received yet.</p>
            <p className="text-xs text-zinc-300 mt-1">Log each offer as it comes in to track them all here.</p>
          </div>
        )}
        <div className="divide-y divide-zinc-100">
          {activeThreads.map((t, i) => renderThread(t, i))}
          {activeThreads.length === 0 && threads.length > 0 && (
            <div className="px-5 py-4 text-center">
              <p className="text-sm text-zinc-400">No active offers.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Accepted offer details + conditions (reuses existing AcceptedOffer model) */}
      {acceptedOffer && (() => {
        const acceptedThread = threads.find((t) => t.status === "accepted");
        const label = acceptedThread?.buyerLabel || "Accepted Offer";
        const DEAL_STYLES = {
          conditional:  { label: "Conditional",  cls: "bg-amber-100 text-amber-800" },
          firm:          { label: "Firm",         cls: "bg-emerald-100 text-emerald-800" },
          fell_through:  { label: "Fell Through", cls: "bg-red-100 text-red-700" },
        };
        const ds = DEAL_STYLES[dealStatus];

        return (
          <Card padding="none">
            <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">Accepted — {label}</h2>
                <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", ds.cls)}>
                  {ds.label}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {acceptedThread && latestRound(acceptedThread.id) && (
                  <button type="button"
                    onClick={() => setEditingRoundThread({ thread: acceptedThread, round: latestRound(acceptedThread.id)! })}
                    className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors">
                    Edit Round
                  </button>
                )}
                <button type="button" onClick={() => setShowEditOffer(true)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors">
                  Edit Deal
                </button>
              </div>
            </div>
            <div className="px-5 py-4 space-y-4">
              <dl className="grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs text-zinc-400">Accepted Price</dt>
                  <dd className="text-sm font-semibold text-zinc-900 mt-0.5">{fmtPrice(acceptedOffer.acceptedPrice)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Deposit Due</dt>
                  <dd className="text-sm font-medium text-zinc-800 mt-0.5">
                    {formatDate(new Date(`${acceptedOffer.depositDueAt}T12:00:00`).toISOString())}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-400">Closing</dt>
                  <dd className="text-sm font-medium text-zinc-800 mt-0.5">
                    {formatDate(new Date(`${acceptedOffer.closingDate}T12:00:00`).toISOString())}
                  </dd>
                </div>
              </dl>
              {conditions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Conditions</p>
                  <div className="space-y-2">
                    {conditions.map((cond) => {
                      const condLabel = cond.conditionType === "other" && cond.conditionLabel
                        ? cond.conditionLabel : CONDITION_TYPE_LABELS[cond.conditionType];
                      const isPending = cond.resolution === "pending";
                      const overdue = isPending && new Date(`${cond.conditionDeadline}T23:59:59`) < new Date();
                      return (
                        <div key={cond.id} className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3",
                          overdue ? "border-red-200 bg-red-50/40"
                            : isPending ? "border-amber-200 bg-amber-50/30"
                            : "border-zinc-100 bg-zinc-50"
                        )}>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium",
                              overdue ? "text-red-800" : isPending ? "text-zinc-800" : "text-zinc-500 line-through"
                            )}>{condLabel}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              Deadline: {formatDate(new Date(`${cond.conditionDeadline}T12:00:00`).toISOString())}
                              {overdue && <span className="text-red-600 font-medium"> · Overdue</span>}
                            </p>
                          </div>
                          {isPending ? (
                            <div className="flex gap-1.5 shrink-0">
                              <button type="button" onClick={() => {
                                const now = new Date().toISOString();
                                updateOfferCondition(cond.id, { resolution: "waived", resolvedAt: now, updatedAt: now });
                                cancelRemindersBySourceId(`offer-cond-${cond.id}`);
                                const updated = conditions.map((c) => c.id === cond.id ? { ...c, resolution: "waived" as const, resolvedAt: now } : c);
                                if (computeDealStatus(updated) === "firm") {
                                  const now2 = new Date().toISOString();
                                  updateLead(lead.id, { stage: "Under Contract", updatedAt: now2 });
                                  addActivity({ id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
                                    title: `All conditions cleared — moved to ${getStageDisplayName("Under Contract", lead.leadType)}`,
                                    description: "All conditions resolved. Deal is now firm.", createdAt: now2, createdBy: currentAgent });
                                  onFirm(acceptedThread?.id ?? "");
                                }
                              }} className="text-xs text-zinc-500 border border-zinc-200 rounded-md px-2.5 py-1 hover:bg-zinc-50 transition-colors">
                                Waived
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 capitalize bg-zinc-100 text-zinc-500">{cond.resolution}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* ── Rejected / Withdrawn History ──────────────────────────────────── */}
      {rejectedThreads.length > 0 && (
        <Card padding="none">
          <div className="px-5 pt-3 pb-2 border-b border-zinc-100">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Rejected / Withdrawn Offers</p>
          </div>
          <div className="divide-y divide-zinc-100 bg-zinc-50/60">
            {rejectedThreads.map((t, i) => renderThread(t, i, true))}
          </div>
        </Card>
      )}

      {/* Modals */}
      {showLogOffer && (
        <LogOfferModal offerNumber={nextOfferNumber} coopLabel={lead.leadType === "Landlord" ? "Tenant's Agent" : "Buyer's Agent"} onClose={() => setShowLogOffer(false)} onSubmit={handleLogOffer} />
      )}
      {counteringThread && (() => {
        const lr = latestRound(counteringThread.thread.id);
        return (
          <CounterModal
            thread={counteringThread.thread}
            currentPrice={lr?.offerPrice ?? 0}
            isBuyerResponse={counteringThread.isBuyerResponse}
            onClose={() => setCounteringThread(null)}
            onSubmit={(data) => handleCounter(counteringThread.thread, data)}
          />
        );
      })()}
      {acceptingThread && (
        <ConfirmAcceptanceModal
          round={{ id: latestRound(acceptingThread.id)?.id ?? "", leadId: lead.id, roundNumber: roundsForThread(acceptingThread.id).length, direction: "buyer_submitted", offerPrice: latestRound(acceptingThread.id)?.offerPrice ?? 0, irrevocableAt: latestRound(acceptingThread.id)?.irrevocableAt ?? "", depositAmount: latestRound(acceptingThread.id)?.depositAmount, status: "active", createdBy: currentAgent, createdAt: acceptingThread.createdAt, updatedAt: acceptingThread.updatedAt }}
          onClose={() => setAcceptingThread(null)}
          onSubmit={(data) => handleAcceptOffer(acceptingThread, data)}
        />
      )}
      {editingRoundThread && (
        <EditSellerRoundModal
          round={editingRoundThread.round}
          coopLabel={lead.leadType === "Landlord" ? "Tenant's Agent" : "Buyer's Agent"}
          onClose={() => setEditingRoundThread(null)}
          onSubmit={(data) => handleEditRound(editingRoundThread.thread, editingRoundThread.round, data)}
        />
      )}
      {showEditOffer && acceptedOffer && (
        <EditAcceptedOfferModal
          acceptedOffer={acceptedOffer}
          onClose={() => setShowEditOffer(false)}
          onSubmit={handleEditAcceptedOffer}
        />
      )}
    </>
  );
}
