"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// ── Shared modal primitives ────────────────────────────────────────────────────

const fi = "w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition border-zinc-200 focus:ring-zinc-300";
const fl = "text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1.5";

function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
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

// ── EditCoopAgentModal ─────────────────────────────────────────────────────────

export interface CoopAgentData {
  coopAgentFirstName: string;
  coopAgentLastName: string;
  coopAgentMobile: string;
  coopAgentBrokerage: string;
}

export function EditCoopAgentModal({ label, initialData, onClose, onSubmit }: {
  label: string;
  initialData?: Partial<CoopAgentData>;
  onClose: () => void;
  onSubmit: (data: CoopAgentData) => void;
}) {
  const [firstName, setFirstName]   = useState(initialData?.coopAgentFirstName ?? "");
  const [lastName, setLastName]     = useState(initialData?.coopAgentLastName ?? "");
  const [mobile, setMobile]         = useState(initialData?.coopAgentMobile ?? "");
  const [brokerage, setBrokerage]   = useState(initialData?.coopAgentBrokerage ?? "");

  return (
    <Modal
      title={`${label} Info`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button type="button"
            onClick={() => onSubmit({ coopAgentFirstName: firstName.trim(), coopAgentLastName: lastName.trim(), coopAgentMobile: mobile.trim(), coopAgentBrokerage: brokerage.trim() })}
            className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
            Save
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fl}>First Name <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. James" className={fi} autoFocus />
        </div>
        <div>
          <label className={fl}>Last Name <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Mitchell" className={fi} />
        </div>
      </div>
      <div>
        <label className={fl}>Mobile <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)}
          placeholder="e.g. 555-555-0123" className={fi} />
      </div>
      <div>
        <label className={fl}>Brokerage <span className="normal-case text-zinc-400 font-normal">(optional)</span></label>
        <input type="text" value={brokerage} onChange={(e) => setBrokerage(e.target.value)}
          placeholder="e.g. Example Brokerage" className={fi} />
      </div>
    </Modal>
  );
}

// ── CoopAgentSection — fields embedded inside another modal ───────────────────

export function CoopAgentSection({ label, firstName, setFirstName, lastName, setLastName, mobile, setMobile, brokerage, setBrokerage }: {
  label: string;
  firstName: string; setFirstName: (v: string) => void;
  lastName: string;  setLastName:  (v: string) => void;
  mobile: string;    setMobile:    (v: string) => void;
  brokerage: string; setBrokerage: (v: string) => void;
}) {
  const hasPrefill = firstName || lastName || mobile || brokerage;
  const [open, setOpen] = useState(!!hasPrefill);

  return (
    <div className="rounded-xl border border-zinc-200">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left px-4 py-3 group">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</p>
        <span className="text-zinc-300 group-hover:text-zinc-500 transition-colors text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-100">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <label className={fl}>First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. James" className={fi} />
            </div>
            <div>
              <label className={fl}>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Mitchell" className={fi} />
            </div>
          </div>
          <div>
            <label className={fl}>Mobile</label>
            <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 555-555-0123" className={fi} />
          </div>
          <div>
            <label className={fl}>Brokerage</label>
            <input type="text" value={brokerage} onChange={(e) => setBrokerage(e.target.value)}
              placeholder="e.g. Example Brokerage" className={fi} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── CoopAgentRow — collapsible display row ────────────────────────────────────

export function CoopAgentRow({ label, firstName, lastName, mobile, brokerage, onEdit }: {
  label: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  brokerage?: string;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasData = firstName || lastName || mobile || brokerage;
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;

  return (
    <div className="border-t border-zinc-100">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left px-4 py-2.5 group md:px-5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</p>
          {!open && (
            <span className="text-xs text-zinc-400">
              {displayName ?? <span className="italic text-zinc-300">Not added</span>}
            </span>
          )}
        </div>
        <span className="text-zinc-300 group-hover:text-zinc-500 transition-colors text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 md:px-5">
          {hasData ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
              {(firstName || lastName) && (
                <>
                  <span className="text-zinc-400">Name</span>
                  <span className="text-zinc-700">{[firstName, lastName].filter(Boolean).join(" ")}</span>
                </>
              )}
              {mobile && (
                <>
                  <span className="text-zinc-400">Mobile</span>
                  <a href={`tel:${mobile.replace(/\s/g, "")}`}
                    className="text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}>
                    {mobile}
                  </a>
                </>
              )}
              {brokerage && (
                <>
                  <span className="text-zinc-400">Brokerage</span>
                  <span className="text-zinc-700">{brokerage}</span>
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 italic mb-3">No co-op agent info added yet.</p>
          )}
          <button type="button" onClick={onEdit}
            className={cn(
              "text-xs font-medium border rounded-lg px-3 py-1.5 transition-colors",
              "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            )}>
            {hasData ? "Edit" : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}
