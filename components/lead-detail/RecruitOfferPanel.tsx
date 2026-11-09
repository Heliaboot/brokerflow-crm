"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn, genId, formatDate, fullName } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useRole, AGENT_NAME, MANAGER_NAME } from "@/lib/role-context";
import { getStageDisplayName } from "@/lib/constants";
import type { Lead, RecruitOffer } from "@/lib/types";

const fi = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition";
const fl = "text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1.5";

const DECLINE_REASONS = [
  "Declined Offer",
  "Staying at Current Brokerage",
  "Joined Another Brokerage",
  "Did Not Meet Brokerage Standards",
  "Other",
];

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
  label: string; disabled: boolean; onClick: () => void; variant?: "dark" | "emerald" | "red";
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={cn(
        "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors",
        disabled ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          : variant === "emerald" ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : variant === "red" ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-zinc-900 text-white hover:bg-zinc-800"
      )}>
      {label}
    </button>
  );
}

// ── Log Offer Modal ────────────────────────────────────────────────────────────

function LogOfferModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: { offerDate: string; commissionSplit: string; proposedStartDate: string; offerExpiryDate?: string; notes?: string }) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [offerDate, setOfferDate] = useState(today);
  const [commissionSplit, setCommissionSplit] = useState("");
  const [proposedStartDate, setProposedStartDate] = useState("");
  const [offerExpiryDate, setOfferExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit = offerDate && commissionSplit.trim() && proposedStartDate;

  return (
    <OfferModal title="Log Offer to Recruit" onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Log Offer" disabled={!canSubmit} onClick={() => { if (!canSubmit) return; onSubmit({ offerDate, commissionSplit, proposedStartDate, offerExpiryDate: offerExpiryDate || undefined, notes: notes || undefined }); }} /></>}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>Offer Date <span className="text-red-400">*</span></label>
          <input type="date" value={offerDate} onChange={(e) => setOfferDate(e.target.value)} className={fi} />
        </div>
        <div>
          <label className={fl}>Commission Split <span className="text-red-400">*</span></label>
          <input type="text" value={commissionSplit} onChange={(e) => setCommissionSplit(e.target.value)}
            placeholder="e.g. 80/20" className={fi} autoFocus />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>Proposed Start Date <span className="text-red-400">*</span></label>
          <input type="date" value={proposedStartDate} onChange={(e) => setProposedStartDate(e.target.value)} className={fi} />
        </div>
        <div>
          <label className={fl}>Irrevocable Date <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="date" value={offerExpiryDate} onChange={(e) => setOfferExpiryDate(e.target.value)} className={fi} />
        </div>
      </div>
      <div>
        <label className={fl}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Any specific terms, conditions, or context…" className={fi} />
      </div>
      {offerExpiryDate && (
        <div className="pt-3 border-t border-zinc-100 space-y-1">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will log</p>
          <p className="text-xs text-zinc-400">· Offer recorded — status: Pending</p>
          <p className="text-xs text-zinc-400">· ⏰ Reminder 3 days before irrevocable date</p>
        </div>
      )}
    </OfferModal>
  );
}

// ── Mark Joined Modal ──────────────────────────────────────────────────────────

function MarkJoinedModal({ offer, onClose, onSubmit }: {
  offer: RecruitOffer;
  onClose: () => void;
  onSubmit: (data: { joinDate: string; referralPotential: string; notes: string }) => void;
}) {
  const [joinDate, setJoinDate] = useState(offer.proposedStartDate);
  const [referralPotential, setReferralPotential] = useState("Unknown");
  const [notes, setNotes] = useState("");

  return (
    <OfferModal title="Mark as Joined" onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Confirm — Joined!" disabled={!joinDate} onClick={() => { if (!joinDate) return; onSubmit({ joinDate, referralPotential, notes }); }} variant="emerald" /></>}>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-emerald-800">✓ Confirm recruit has joined the brokerage.</p>
        <p className="text-xs text-emerald-600 mt-0.5">Verify the join date and referral potential, then confirm.</p>
      </div>
      <div>
        <label className={fl}>Join Date <span className="text-red-400">*</span></label>
        <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className={fi} />
        <p className="text-xs text-zinc-400 mt-1">Pre-filled from proposed start date. Edit if needed.</p>
      </div>
      <div>
        <label className={fl}>Referral Potential</label>
        <select value={referralPotential} onChange={(e) => setReferralPotential(e.target.value)}
          className={fi + " appearance-none"}>
          {["High", "Medium", "Low", "Unknown"].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className={fl}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Onboarding notes, first day logistics…" className={fi} />
      </div>
      <div className="pt-3 border-t border-zinc-100 space-y-1">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">This will create</p>
        <p className="text-xs text-zinc-400">· Joined checklist (4 tasks)</p>
        <p className="text-xs text-zinc-400">· ⚠️ Licence transfer deadline reminder (join date + 50 days) — regulatory compliance step</p>
      </div>
    </OfferModal>
  );
}

// ── Decline Modal ──────────────────────────────────────────────────────────────

type DeclineOutcome = "nurture" | "lost";

function DeclineOfferModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (reason: string, notes: string, outcome: DeclineOutcome) => void;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<DeclineOutcome>("nurture");

  const outcomeOptions: { value: DeclineOutcome; label: string; sub: string }[] = [
    { value: "nurture", label: "Keep in touch — nurture for later", sub: "Recruit moves to nurture. A 6-month follow-up reminder will be created." },
    { value: "lost",    label: "Mark as Lost — do not contact",     sub: "Recruit is permanently closed. No reminders will be created." },
  ];

  return (
    <OfferModal title="Offer Declined" onClose={onClose}
      footer={<><CancelBtn onClose={onClose} /><SubmitBtn label="Confirm" disabled={!reason} onClick={() => { if (!reason) return; onSubmit(reason, notes, outcome); }} variant={outcome === "lost" ? "red" : "dark"} /></>}>
      <div>
        <label className={fl}>Reason for Declining <span className="text-red-400">*</span></label>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={fi + " appearance-none"}>
          <option value="">Select reason…</option>
          {DECLINE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className={fl}>What happens next?</label>
        <div className="space-y-2">
          {outcomeOptions.map((o) => (
            <button key={o.value} type="button" onClick={() => setOutcome(o.value)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border transition-colors",
                outcome === o.value
                  ? o.value === "lost" ? "border-red-300 bg-red-50" : "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-300"
              )}>
              <p className={cn("text-sm font-medium", outcome === o.value && o.value === "lost" ? "text-red-800" : "text-zinc-800")}>{o.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{o.sub}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={fl}>Notes <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Any context worth remembering for a future follow-up…" className={fi} />
      </div>
    </OfferModal>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function RecruitOfferPanel({ lead, onJoined }: { lead: Lead; onJoined: () => void }) {
  const {
    recruitOffers, addRecruitOffer, updateRecruitOffer,
    addActivity, addReminder, cancelRemindersBySourceId,
    updateLead,
  } = useStore();
  const { role } = useRole();
  const currentAgent = role === "agent" ? AGENT_NAME : MANAGER_NAME;

  const [showLogOffer, setShowLogOffer] = useState(false);
  const [showJoined, setShowJoined] = useState(false);
  const [showDecline, setShowDecline] = useState(false);

  // Active offer = pending or accepted; previous = declined ones
  const allLeadOffers = recruitOffers.filter((o) => o.leadId === lead.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const activeOffer = allLeadOffers.find((o) => o.status === "pending" || o.status === "accepted");

  const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-800" },
    accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-800" },
    declined: { label: "Declined", cls: "bg-red-100 text-red-700" },
  };

  const handleLogOffer = (data: { offerDate: string; commissionSplit: string; proposedStartDate: string; offerExpiryDate?: string; notes?: string }) => {
    const now = new Date().toISOString();
    const newOffer: RecruitOffer = {
      id: `ro-${genId()}`, leadId: lead.id,
      offerDate: data.offerDate,
      commissionSplit: data.commissionSplit,
      proposedStartDate: data.proposedStartDate,
      offerExpiryDate: data.offerExpiryDate,
      status: "pending",
      notes: data.notes,
      createdBy: currentAgent, createdAt: now, updatedAt: now,
    };
    addRecruitOffer(newOffer);

    // Always cancel any previous offer expiry reminder before creating a new one
    cancelRemindersBySourceId(`recruit-offer-expiry-${lead.id}`);

    // Offer expiry reminder — 3 days before
    if (data.offerExpiryDate) {
      const expiryMs = new Date(`${data.offerExpiryDate}T09:00:00`).getTime();
      const reminderMs = expiryMs - 3 * 86_400_000;
      if (reminderMs > Date.now()) {
        addReminder({
          id: `r-${genId()}-rexp`, leadId: lead.id, leadName: fullName(lead),
          title: `⏰ Recruit offer irrevocable date — ${lead.firstName}`,
          dueDate: new Date(reminderMs).toISOString(),
          createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
          completed: false, priority: "high", sourceId: `recruit-offer-expiry-${lead.id}`,
        });
      }
    }

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "offer",
      title: `Offer extended — ${data.commissionSplit} split`,
      description: `Commission: ${data.commissionSplit}. Proposed start: ${formatDate(new Date(`${data.proposedStartDate}T12:00:00`).toISOString())}.${data.notes ? ` ${data.notes}` : ""}`,
      createdAt: now, createdBy: currentAgent,
    });
    setShowLogOffer(false);
  };

  const handleJoined = (data: { joinDate: string; referralPotential: string; notes: string }) => {
    const now = new Date().toISOString();
    if (activeOffer) updateRecruitOffer(activeOffer.id, { status: "accepted", updatedAt: now });

    // Cancel offer expiry reminder
    cancelRemindersBySourceId(`recruit-offer-expiry-${lead.id}`);

    // Licence transfer deadline (regulatory compliance step) — join_date + 50 days
    const joinMs = new Date(`${data.joinDate}T09:00:00`).getTime();
    const licenceDeadline = new Date(joinMs + 50 * 86_400_000).toISOString();
    addReminder({
      id: `r-${genId()}-licence`, leadId: lead.id, leadName: fullName(lead),
      title: `⚠️ Licence transfer deadline — ${lead.firstName}`,
      dueDate: licenceDeadline,
      createdAt: now, followUpStatus: lead.followUpStatus, assignedTo: lead.assignedAgent,
      completed: false, priority: "high",
      sourceId: `recruit-licence-transfer-${lead.id}`,
    });

    addActivity({
      id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
      title: `🎉 Recruit joined — ${getStageDisplayName("Closed", lead.leadType)}`,
      description: [
        `Join date: ${formatDate(new Date(`${data.joinDate}T12:00:00`).toISOString())}`,
        data.referralPotential !== "Unknown" && `Referral potential: ${data.referralPotential}`,
        data.notes,
      ].filter(Boolean).join(". "),
      createdAt: now, createdBy: currentAgent,
    });

    updateLead(lead.id, {
      stage: "Closed", followUpStatus: "Paused", joinDate: data.joinDate,
      lastContactedAt: now, updatedAt: now,
    });
    setShowJoined(false);
    onJoined();
  };

  const handleDecline = (reason: string, notes: string, outcome: DeclineOutcome) => {
    const now = new Date().toISOString();
    if (activeOffer) updateRecruitOffer(activeOffer.id, { status: "declined", updatedAt: now });
    cancelRemindersBySourceId(`recruit-offer-expiry-${lead.id}`);

    if (outcome === "nurture") {
      // Move back to In Conversation, set long-term nurture, create 6-month reminder
      const sixMonthDate = new Date();
      sixMonthDate.setMonth(sixMonthDate.getMonth() + 6);
      addActivity({
        id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
        title: `Offer declined — nurturing for future`,
        description: [
          `Reason: ${reason}`,
          notes,
          "Recruit moved back to In Conversation. 6-month follow-up scheduled.",
        ].filter(Boolean).join(". "),
        createdAt: now, createdBy: currentAgent,
      });
      addReminder({
        id: `r-${genId()}-nurture`, leadId: lead.id, leadName: fullName(lead),
        title: `Follow up with ${lead.firstName} — offer was declined`,
        dueDate: sixMonthDate.toISOString(),
        createdAt: now, followUpStatus: "Long-Term Follow-Up",
        assignedTo: lead.assignedAgent, completed: false, priority: "low",
      });
      updateLead(lead.id, {
        stage: "Showing / Active Search",
        followUpStatus: "Long-Term Follow-Up",
        lossReason: reason,
        updatedAt: now,
      });
    } else {
      addActivity({
        id: `act-${genId()}`, leadId: lead.id, type: "stage_change",
        title: `Offer declined — marked as Lost`,
        description: notes || `Recruit offer declined: ${reason}. Lead marked as Lost.`,
        createdAt: now, createdBy: currentAgent,
      });
      updateLead(lead.id, { stage: "Lost", followUpStatus: "Do Not Contact", lossReason: reason, updatedAt: now });
    }
    setShowDecline(false);
  };

  return (
    <>
      <Card padding="none">
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Offer to Recruit</h2>
          {!activeOffer && (
            <button type="button" onClick={() => setShowLogOffer(true)}
              className="text-xs font-medium text-zinc-900 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:bg-zinc-50 transition-colors">
              + Log Offer
            </button>
          )}
        </div>

        {!activeOffer && allLeadOffers.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-zinc-400">No offer logged yet.</p>
            <p className="text-xs text-zinc-300 mt-1">Log the commission split and proposed start date.</p>
          </div>
        ) : activeOffer ? (
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", STATUS_STYLES[activeOffer.status].cls)}>
                {STATUS_STYLES[activeOffer.status].label}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-zinc-400">Commission Split</dt>
                <dd className="text-sm font-semibold text-zinc-900 mt-0.5">{activeOffer.commissionSplit}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Offer Date</dt>
                <dd className="text-sm font-medium text-zinc-800 mt-0.5">
                  {formatDate(new Date(`${activeOffer.offerDate}T12:00:00`).toISOString())}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Proposed Start</dt>
                <dd className="text-sm font-medium text-zinc-800 mt-0.5">
                  {formatDate(new Date(`${activeOffer.proposedStartDate}T12:00:00`).toISOString())}
                </dd>
              </div>
              {activeOffer.offerExpiryDate && (
                <div>
                  <dt className="text-xs text-zinc-400">Irrevocable Date</dt>
                  <dd className="text-sm font-medium text-zinc-800 mt-0.5">
                    {formatDate(new Date(`${activeOffer.offerExpiryDate}T12:00:00`).toISOString())}
                  </dd>
                </div>
              )}
            </dl>
            {activeOffer.notes && (
              <p className="text-xs text-zinc-500 border-t border-zinc-100 pt-3">{activeOffer.notes}</p>
            )}
            {activeOffer.status === "pending" && (
              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <button type="button" onClick={() => setShowJoined(true)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
                  Mark Joined ✓
                </button>
                <button type="button" onClick={() => setShowDecline(true)}
                  className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
                  Offer Declined
                </button>
              </div>
            )}
          </div>
        ) : (
          /* No active offer — show previous declined offers + option to log a new one */
          <div className="px-5 py-4 space-y-3">
            {allLeadOffers.map((o, i) => (
              <div key={o.id} className="rounded-xl border border-zinc-100 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">Offer {allLeadOffers.length - i}</span>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", STATUS_STYLES[o.status]?.cls ?? "bg-zinc-100 text-zinc-600")}>
                    {STATUS_STYLES[o.status]?.label ?? o.status}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-xs text-zinc-400">Split</dt>
                    <dd className="text-sm font-medium text-zinc-800">{o.commissionSplit}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-400">Date</dt>
                    <dd className="text-sm text-zinc-700">{formatDate(new Date(`${o.offerDate}T12:00:00`).toISOString())}</dd>
                  </div>
                </dl>
                {o.notes && <p className="text-xs text-zinc-400 pt-1 border-t border-zinc-100">{o.notes}</p>}
              </div>
            ))}
            <button type="button" onClick={() => setShowLogOffer(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-zinc-300 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
              + Log New Offer
            </button>
          </div>
        )}
      </Card>

      {showLogOffer && <LogOfferModal onClose={() => setShowLogOffer(false)} onSubmit={handleLogOffer} />}
      {showJoined && activeOffer && <MarkJoinedModal offer={activeOffer} onClose={() => setShowJoined(false)} onSubmit={handleJoined} />}
      {showDecline && <DeclineOfferModal onClose={() => setShowDecline(false)} onSubmit={handleDecline} />}
    </>
  );
}
