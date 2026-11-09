"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { Lead, ChecklistItem } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const parsePriceInput = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

const fi =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition border-zinc-200 focus:ring-zinc-300";

// Shared checkmark SVG (mirrors LeadDetailClient)
function CheckSVG() {
  return (
    <svg className="w-3 h-3 text-white" viewBox="0 0 12 10" fill="none">
      <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Listing Details Card ──────────────────────────────────────────────────────

function ListingDetailsCard({ lead, isLandlord = false }: { lead: Lead; isLandlord?: boolean }) {
  const { listingDetails, updateListingDetails } = useStore();

  const ld = listingDetails.find((d) => d.leadId === lead.id);
  const [editing, setEditing] = useState(false);
  const [expectedPrice, setExpectedPrice] = useState(
    ld?.expectedListingPrice ? String(ld.expectedListingPrice) : ""
  );
  const [targetListDate, setTargetListDate] = useState(ld?.targetListDate ?? "");
  const [mlsNumber, setMlsNumber] = useState(ld?.mlsNumber ?? "");
  const [expiryDate, setExpiryDate] = useState(ld?.listingAgreementExpiryDate ?? "");

  if (!ld) return null;

  const handleSave = () => {
    const now = new Date().toISOString();
    updateListingDetails(ld.id, {
      expectedListingPrice: expectedPrice ? parsePriceInput(expectedPrice) : undefined,
      targetListDate: targetListDate || undefined,
      mlsNumber: mlsNumber.trim() || undefined,
      listingAgreementExpiryDate: expiryDate || undefined,
      updatedAt: now,
    });
    setEditing(false);
  };

  const fmtDate = (d?: string) =>
    d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <Card padding="none">
      <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Listing Details</h2>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)}
            className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors">
            Edit
          </button>
        ) : (
          <div className="flex gap-3">
            <button type="button" onClick={() => setEditing(false)}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSave}
              className="text-xs font-medium text-zinc-900 hover:text-zinc-600 transition-colors">
              Save
            </button>
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Agreement dates — always show, not editable here (set during sign listing) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-400">Agreement Signed</p>
            <p className="text-sm font-medium text-zinc-800 mt-0.5">
              {fmtDate(ld.listingAgreementSignedDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Agreement Expiry</p>
            {editing ? (
              <input type="date" value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={cn(fi, "mt-0.5 text-xs py-1.5")} />
            ) : (
              <p className={cn(
                "text-sm font-medium mt-0.5",
                ld.listingAgreementExpiryDate && new Date(ld.listingAgreementExpiryDate) < new Date()
                  ? "text-red-600" : "text-zinc-800"
              )}>
                {fmtDate(ld.listingAgreementExpiryDate)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-400">{isLandlord ? "Monthly Rent" : "Expected Price"}</p>
            {editing ? (
              <input type="text" value={expectedPrice}
                onChange={(e) => setExpectedPrice(e.target.value)}
                placeholder="e.g. 850000"
                className={cn(fi, "mt-0.5 text-xs py-1.5")} />
            ) : (
              <p className="text-sm font-medium text-zinc-800 mt-0.5">
                {ld.expectedListingPrice ? fmtPrice(ld.expectedListingPrice) : "—"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400">Target List Date</p>
            {editing ? (
              <input type="date" value={targetListDate}
                onChange={(e) => setTargetListDate(e.target.value)}
                className={cn(fi, "mt-0.5 text-xs py-1.5")} />
            ) : (
              <p className="text-sm font-medium text-zinc-800 mt-0.5">
                {fmtDate(ld.targetListDate)}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-zinc-400">
            MLS # <span className="text-zinc-300 font-normal">— fill when listed</span>
          </p>
          {editing ? (
            <input type="text" value={mlsNumber}
              onChange={(e) => setMlsNumber(e.target.value)}
              placeholder="e.g. C12345678"
              className={cn(fi, "mt-0.5 text-xs py-1.5")} />
          ) : (
            <p className="text-sm font-medium text-zinc-800 mt-0.5">
              {ld.mlsNumber || <span className="text-zinc-300 font-normal italic">Not yet listed</span>}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Pre-Listing Checklist Panel ───────────────────────────────────────────────

export function PreListingChecklistPanel({
  items,
  onComplete,
  onOpenModal,
}: {
  items: ChecklistItem[];
  onComplete: (id: string, note?: string) => void;
  onOpenModal: () => void;
}) {
  if (items.length === 0) return null;
  const doneCount = items.filter((i) => i.status === "done").length;
  const allDone = doneCount === items.length;

  const fmtChecklistDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Card padding="none">
      <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Pre-Listing Checklist</h2>
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
                <div className="flex items-center gap-3 opacity-60">
                  <div className="shrink-0 h-5 w-5 rounded bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center">
                    <CheckSVG />
                  </div>
                  <p className="text-sm text-zinc-400 line-through flex-1">{item.name}</p>
                </div>
              ) : hasReminder ? (
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

      <div className="px-5 py-2.5 border-t border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 rounded-full transition-all duration-300"
              style={{ width: `${(doneCount / items.length) * 100}%` }} />
          </div>
          <span className="text-xs text-zinc-400">{doneCount}/{items.length}</span>
        </div>
      </div>
    </Card>
  );
}

// ── Main PreListingPanel export ───────────────────────────────────────────────

export function PreListingPanel({
  lead,
  checklistItems,
  onComplete,
  onOpenChecklistModal,
  isLandlord = false,
}: {
  lead: Lead;
  checklistItems: ChecklistItem[];
  onComplete: (id: string, note?: string) => void;
  onOpenChecklistModal: () => void;
  isLandlord?: boolean;
}) {
  return (
    <>
      <ListingDetailsCard lead={lead} isLandlord={isLandlord} />
      <PreListingChecklistPanel
        items={checklistItems}
        onComplete={onComplete}
        onOpenModal={onOpenChecklistModal}
      />
    </>
  );
}
