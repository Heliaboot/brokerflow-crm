"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useStore } from "@/lib/store";
import { useRole, AGENT_NAME, MANAGER_NAME } from "@/lib/role-context";
import {
  PIPELINE_STAGES,
  LEAD_TYPES,
  LEAD_CATEGORIES,
  CLIENT_TIMELINES,
  PREFERRED_CONTACT_METHODS,
  QUALIFICATION_STATUSES,
  FOLLOW_UP_STATUSES,
  RELATIONSHIP_STATUSES,
  LEAD_SOURCES,
  LEAD_PRIORITIES,
  FINANCING_STATUSES,
  PROPERTY_TYPES,
} from "@/lib/constants";
import type { Lead, LeadType, LeadCategory, RelationshipStatus, PreferredContactMethod, FollowUpStatus, LeadPriority, QualificationStatus, PipelineStage, FinancingStatus } from "@/lib/types";

// ── Primitives ────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1 font-normal text-zinc-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function MiniGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-zinc-600">{title}</span>
        <span
          className={`text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div className={`grid transition-all duration-200 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-2.5 bg-white space-y-2.5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const base = "w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition";
const input     = `${base} border-zinc-200 focus:ring-zinc-300`;
const inputErr  = `${base} border-red-300 focus:ring-red-200`;
const textarea  = `${input} resize-none`;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewLeadPage() {
  const router = useRouter();
  const { addLead } = useStore();
  const { role } = useRole();

  const [submitted, setSubmitted]       = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [email, setEmail]               = useState("");
  const [phone, setPhone]               = useState("");
  const [contactError, setContactError] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setContactError(true);
      (e.target as HTMLFormElement)
        .querySelector<HTMLInputElement>('input[type="email"]')
        ?.focus();
      return;
    }
    setContactError(false);

    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string | null)?.trim() ?? "";

    const now = new Date().toISOString();
    const assignedAgent = role === "agent" ? AGENT_NAME : MANAGER_NAME;

    const preferredAreasRaw = get("preferredAreas");
    const preferredAreas = preferredAreasRaw
      ? preferredAreasRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const newLead: Lead = {
      id: `l-${Date.now()}`,
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: email.trim(),
      phone: phone.trim(),
      stage: (get("stage") as PipelineStage) || "New",
      qualificationStatus: (get("qualificationStatus") as QualificationStatus) || "Pending Review",
      followUpStatus: (get("followUpStatus") as FollowUpStatus) || "Active Follow-Up",
      relationshipStatus: (get("relationshipStatus") as RelationshipStatus) || "Prospect",
      assignedAgent,
      source: get("source") || "Manual Entry",
      leadType: (get("leadType") as LeadType) || undefined,
      leadCategory: (get("leadCategory") as LeadCategory) || undefined,
      preferredContactMethod: (get("preferredContactMethod") as PreferredContactMethod) || undefined,
      propertyType: get("propertyType") || undefined,
      budget: get("budgetMin") || undefined,
      budgetMax: get("budgetMax") || undefined,
      preferredAreas,
      priority: (get("priority") as LeadPriority) || "Medium",
      clientTimeline: undefined,
      financingStatus: (get("financingStatus") as FinancingStatus) || undefined,
      notes: get("internalNotes") || undefined,
      tags: get("internalTags")
        ? get("internalTags").split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      motivationNotes: get("motivationNotes") || undefined,
      bedroomBathroomPrefs: get("bedroomBathroom") || undefined,
      propertyFeatures: get("propertyFeatures") || undefined,
      schoolTransitNotes: get("schoolTransitNotes") || undefined,
      investmentGoals: get("investmentGoals") || undefined,
      createdAt: now,
      updatedAt: now,
    };

    addLead(newLead);
    setSubmitted(true);
    setTimeout(() => router.push("/leads"), 1200);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto mt-24 text-center">
        <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center text-2xl mx-auto mb-4">✓</div>
        <h2 className="text-lg font-semibold text-zinc-900">Lead created</h2>
        <p className="text-sm text-zinc-500 mt-1">Redirecting to lead list…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link href="/leads" className="text-xs text-zinc-400 hover:text-zinc-700">← Leads</Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-zinc-900">New Lead</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Create a lead in seconds. Add more detail when ready.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>

        {/* ── S1: Contact Information ─────────────────────────────────────── */}
        <Card padding="md">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">Contact Information</h2>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required>
              <input className={input} name="firstName" type="text" placeholder="First name" required />
            </Field>
            <Field label="Last Name" required>
              <input className={input} name="lastName" type="text" placeholder="Last name" required />
            </Field>
          </div>

          <div className="mt-3">
            {contactError && (
              <p className="text-xs font-medium text-red-500 mb-2">
                Provide at least an email address or phone number.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" hint="or phone">
                <input
                  className={contactError ? inputErr : input}
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setContactError(false); }}
                />
              </Field>
              <Field label="Phone" hint="or email">
                <input
                  className={contactError ? inputErr : input}
                  name="phone"
                  type="tel"
                  placeholder="555-555-0100"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setContactError(false); }}
                />
              </Field>
            </div>
          </div>

          <div className="mt-3">
            <Field label="Preferred Contact Method" hint="optional">
              <Select className={input} name="preferredContactMethod" defaultValue="">
                <option value="">Select method…</option>
                {PREFERRED_CONTACT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        {/* ── S2: Lead Classification ─────────────────────────────────────── */}
        <Card padding="md">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">Lead Classification</h2>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lead Type" required>
              <Select className={input} name="leadType" required defaultValue="">
                <option value="" disabled>Select type…</option>
                {LEAD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Relationship Status" required>
              <Select className={input} name="relationshipStatus" required defaultValue="">
                <option value="" disabled>Select status…</option>
                {RELATIONSHIP_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Lead Source — visually separated, mandatory */}
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <div className="mb-1.5">
              <span className="text-xs font-semibold text-zinc-700">Lead Source</span>
              <span className="text-red-500 ml-0.5">*</span>
            </div>
            <Select className={input} name="source" required defaultValue="">
              <option value="" disabled>Where did this lead come from?</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <p className="text-[11px] text-zinc-400 mt-1.5">Required for attribution and brokerage reporting.</p>
          </div>

          {/* Assignment notice */}
          <div className="mt-4 rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
            <p className="text-xs text-zinc-400">
              This lead will be assigned automatically based on brokerage routing rules.
            </p>
          </div>
        </Card>

        {/* ── S3: Quick Preferences ───────────────────────────────────────── */}
        <Card padding="md">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">Quick Preferences</h2>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Property Type" required>
              <Select className={input} name="propertyType" required defaultValue="">
                <option value="" disabled>Select type…</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Budget Min" hint="optional">
              <input className={input} name="budgetMin" type="text" placeholder="e.g. $700,000" />
            </Field>
            <div className="col-span-2">
              <Field label="Preferred Areas" hint="optional, comma-separated">
                <input className={input} name="preferredAreas" type="text" placeholder="e.g. Eastside, Eastgate, East Village" />
              </Field>
            </div>
          </div>
        </Card>

        {/* ── Expandable: More Lead Details ──────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-zinc-50 transition-colors text-left"
          >
            <div>
              <p className="text-sm font-medium text-zinc-600">More Lead Details <span className="text-zinc-400 font-normal">(Optional)</span></p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Add timeline, financing, search preferences, and internal CRM details.
              </p>
            </div>
            <span
              className={`text-zinc-300 transition-transform duration-200 shrink-0 ml-3 ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>

          <div className={`grid transition-all duration-300 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden">
              <div className="px-4 pb-4 pt-3 border-t border-zinc-100 bg-white space-y-2">

                {/* Mini group 1 — Client Readiness */}
                <MiniGroup title="Client Readiness">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Client Timeline">
                      <Select className={input} name="clientTimeline" defaultValue="">
                        <option value="">Select timeline…</option>
                        {CLIENT_TIMELINES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Motivation Notes">
                      <textarea className={textarea} name="motivationNotes" rows={2} placeholder="Growing family, downsizing, relocation." />
                    </Field>
                    <div className="col-span-2">
                      <Field label="Timeline Notes">
                        <input className={input} name="timelineNotes" type="text" placeholder="Any timing details or constraints…" />
                      </Field>
                    </div>
                  </div>
                </MiniGroup>

                {/* Mini group 2 — Financing */}
                <MiniGroup title="Financing">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Budget Max">
                      <input className={input} name="budgetMax" type="text" placeholder="e.g. $950,000" />
                    </Field>
                    <Field label="Financing Status">
                      <Select className={input} name="financingStatus" defaultValue="">
                        <option value="">Select status…</option>
                        {FINANCING_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Mortgage Pre-Approval">
                      <Select className={input} name="mortgagePreApproval" defaultValue="">
                        <option value="">Select…</option>
                        <option value="yes">Yes — pre-approved</option>
                        <option value="in_progress">In progress</option>
                        <option value="no">Not yet</option>
                        <option value="cash">Cash buyer</option>
                      </Select>
                    </Field>
                    <Field label="Investment Goals">
                      <input className={input} name="investmentGoals" type="text" placeholder="e.g. Long-term hold, rental income" />
                    </Field>
                  </div>
                </MiniGroup>

                {/* Mini group 3 — Search Preferences */}
                <MiniGroup title="Search Preferences">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Bedrooms / Bathrooms">
                      <input className={input} name="bedroomBathroom" type="text" placeholder="e.g. 3 bed, 2 bath min" />
                    </Field>
                    <Field label="Property Features">
                      <input className={input} name="propertyFeatures" type="text" placeholder="e.g. Backyard, garage, basement" />
                    </Field>
                    <div className="col-span-2">
                      <Field label="School / Transit / Lifestyle Notes">
                        <textarea className={textarea} name="schoolTransitNotes" rows={2} placeholder="e.g. Near top-rated elementary school, walking distance to subway." />
                      </Field>
                    </div>
                  </div>
                </MiniGroup>

                {/* Mini group 4 — Internal CRM */}
                <MiniGroup title="Internal CRM">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Internal Notes">
                      <textarea className={textarea} name="internalNotes" rows={2} placeholder="Additional context, referral details…" />
                    </Field>
                    <Field label="Internal Tags" hint="comma-separated">
                      <input className={input} name="internalTags" type="text" placeholder="e.g. pre-approved, VIP" />
                    </Field>
                    <Field label="Follow-Up Status">
                      <Select className={input} name="followUpStatus" defaultValue="Active Follow-Up">
                        {FOLLOW_UP_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Priority">
                      <Select className={input} name="priority" defaultValue="Medium">
                        {LEAD_PRIORITIES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Qualification Status">
                      <Select className={input} name="qualificationStatus" defaultValue="Pending Review">
                        {QUALIFICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Lead Category" hint="optional">
                      <Select className={input} name="leadCategory" defaultValue="">
                        <option value="">Select category…</option>
                        {LEAD_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Select>
                    </Field>
                    <div className="col-span-2">
                      <Field label="Pipeline Stage">
                        <Select className={input} name="stage" defaultValue="New">
                          {PIPELINE_STAGES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  </div>
                </MiniGroup>

              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pb-4">
          <Link href="/leads">
            <Button variant="secondary" type="button">Cancel</Button>
          </Link>
          <Button type="submit">Create Lead</Button>
        </div>

      </form>
    </div>
  );
}
