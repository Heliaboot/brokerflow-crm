# BrokerFlow CRM

A working CRM prototype for a Toronto residential brokerage, designed around how a brokerage actually runs: five lead pipelines, each with its own stages, conversion point, checklists and regulatory compliance steps.

> **Portfolio case study.** This is an anonymized copy of a client prototype. Company, agent, system and place names have been replaced; all leads are fictional demo data. The prototype runs entirely in the browser — no backend, no login.

---

## 1. The problem

The brokerage ran its leads across spreadsheets, inboxes and memory. Every team handled buyers, sellers, landlords, tenants and agent recruiting differently, so:

- leads were followed up late or not at all, and nobody could see it happening;
- "how many clients did we win this month?" meant something different for a seller (a signed listing) than for a buyer (an active search), so reporting mixed incompatible numbers;
- regulatory steps (signed buyer agreement before an offer, seller identity check, agent licence transfer deadlines) depended on individual agents remembering them;
- the owner had no single view of pipeline value or commission income.

The goal was a CRM built around the brokerage's own workflow rather than a generic sales CRM bent to fit real estate.

## 2. My role

**Business analyst** — requirements, pipeline design and specifications.

- Ran discovery with the brokerage on how each type of deal moves, where it stalls and what has to be documented.
- Designed the five pipelines, the shared stage model, conversion rules, exit paths, checklists and reminder rules.
- Wrote the functional specification, rulebook, field dictionary and database design rules used as the source of truth (kept in a separate workspace, not included here).
- Used this prototype as a **living specification**: every rule is clickable, so the brokerage could validate workflows before any production build.

## 3. Key design decisions

### Five separate pipelines
Buyer, Seller, Landlord, Tenant and Recruit each get their own flow, wording, checklists and loss reasons. Investor and "Other" leads follow the Buyer flow. A single generic pipeline would have forced sellers through buyer stages and made every report ambiguous.

### One internal stage key, different display names per pipeline
All logic and reporting use one set of internal stage keys (`PipelineStage` in `lib/types.ts`). Agents see pipeline-specific names, resolved by `getStageDisplayName(stage, leadType)` from `STAGE_DISPLAY_NAME_OVERRIDES` in `lib/constants.ts`. Code never compares against display names.

| Stage key (code) | Buyer | Seller | Landlord | Tenant | Recruit |
|---|---|---|---|---|---|
| `New` | New | New | New | New | New |
| `Contacted` | Contacted | Contacted | Contacted | Contacted | Contacted |
| `Appointment Scheduled` | Appointment Scheduled | Appointment Scheduled | Appointment Scheduled | Appointment Scheduled | Appointment Scheduled |
| `Pre-Listing` | — | Pre-Listing ★ | Pre-Listing ★ | — | — |
| `Showing / Active Search` | Showing / Active Search ★ | Listed / Active | Listed / Active | Showing / Active Search ★ | In Conversation ★ |
| `Offer` | Offer | Offer Received | Application Received | Application Submitted | — |
| `Under Contract` | Under Contract | Under Contract | Lease Signed | Lease Signed | Offer Extended |
| `Closed` | Closed | Closed | Closed | Closed | Joined |
| `Lost` | Inactive | Inactive | Inactive | Inactive | Inactive |

★ = conversion point. "—" = the pipeline skips that stage.

### Per-pipeline conversion points
A lead becomes a client at a different moment per pipeline, returned by `getConversionStage(leadType)`:

- **Seller / Landlord** — at `Pre-Listing`, when the listing agreement is signed. The first signing is time-stamped in `preListingAt` and never overwritten.
- **Buyer / Tenant / Recruit** (and Investor) — at `Showing / Active Search`.

For Seller/Landlord, `Showing / Active Search` means "listed" — tracked, but not the conversion metric.

### Three exit paths
A lead can leave the active flow three ways, each with its own meaning:

- **Not Now** — the client isn't ready. The lead leaves the active pipeline into long-term nurture (follow-up status *Long-Term Follow-Up*, relationship *Past Client*) with 6-month and 1-year check-in reminders. Stored as stage `Closed` with `closeReason: "closed_elsewhere"`, and **excluded from closed-deal metrics**.
- **Inactive** — terminal. Moves to `Lost` (shown as "Inactive"), follow-up *Do Not Contact*, with a pipeline-specific reason.
- **Pause** — Buyer and Tenant only, at *Showing / Active Search* and *Offer*. The lead keeps its stage, follow-up status becomes *Paused*, with an optional return date and reminder. (Seller/Landlord use *Suspend Listing* instead.)

### Metrics built from stage keys
Dashboards, reports and the Business Overview count stage keys, never display names, so one query works across all five pipelines and conversion is measured per pipeline at the right stage. All of them use the same closed-won rule (`isClosedWon()`): Reports shows "Not Now" leads as a separate *Not Now (nurture)* row, never as closed deals. Report numbers are calculated live from the data (`lib/report-metrics.ts`).

### Owner-level Business Overview
A separate page for the owner (manager role) with live, estimated metrics from `lib/business-metrics.ts`. The assumptions are stated on the page and in the code:

| Metric | How it is calculated |
|---|---|
| Active Pipeline GCI | Sum of estimated gross commission for all leads not Closed/Lost (Recruit/Other excluded) |
| GCI Closed (last 90 days) | Same estimate for closed-won leads updated in the last 90 days |
| Conversion rate | Closed-won ÷ (Closed-won + Inactive). "Not Now" leads count as neither |
| Avg days to close | Mean of `updatedAt − createdAt` across closed-won leads |
| Pipeline value by source | Estimated deal **price** (not commission) of active leads, per lead source |

GCI assumptions:

- **Seller** — price × the brokerage's **listing-side** share. A recorded commission of `"4%"` is the total, so the share is 2% (4% on $1,350,000 → $27,000). `"2.5% + 2.5%"` lists both sides, so the share is 2.5%. With nothing recorded: 2.5%. Price comes from the accepted offer, otherwise the expected listing price, otherwise the lead's budget.
- **Buyer / Investor** — price × 2.5% (accepted price, otherwise latest offer, otherwise budget midpoint).
- **Landlord / Tenant** — half of one month's rent (lease, otherwise approved application, otherwise a "/mo" budget).
- These are estimates. True historical trends ("pipeline value six months ago") would need a monthly snapshot table in production.

## 4. Screens

> Screenshots to add.

| Screen | Placeholder |
|---|---|
| Agent dashboard — overdue first contact, pipeline by stage | `![Agent dashboard](docs/screens/agent-dashboard.png)` |
| Lead detail — Buyer in active search, offer threads | `![Buyer lead](docs/screens/lead-buyer.png)` |
| Lead detail — Seller pre-listing checklist and listing agreement | `![Seller lead](docs/screens/lead-seller.png)` |
| Buyer agreement step with the *Regulatory compliance step* tag | `![Compliance step](docs/screens/compliance-step.png)` |
| Exit paths — Not Now / Inactive / Pause | `![Exit paths](docs/screens/exit-paths.png)` |
| Manager dashboard and Reports | `![Reports](docs/screens/reports.png)` |
| Business Overview (owner view) | `![Business Overview](docs/screens/business-overview.png)` |

## 5. Tech stack

Versions from `package.json`:

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| UI | React 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`), `clsx`, `tailwind-merge` |
| Linting | ESLint 9 with `eslint-config-next` 16.2.6 |
| State | React context store (`lib/store.tsx`) persisted to `localStorage` — no backend |

Designed for a production build on a hosted Postgres backend with row-level security; `lib/types.ts` maps almost 1:1 to the planned tables.

## 6. How to run the demo

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

- **Agent / Manager** — switch roles in the sidebar. The agent view shows one demo agent's leads; the manager view adds Business Overview, Admin Queue and Reports.
- **Your changes are saved** in the browser's `localStorage` and survive reloads.
- **Reset the demo data** — "Reset Demo" in the sidebar, or open `/reset`.
- `/api/debug` returns the mock lead counts.

Bump `STORE_VERSION` in `lib/storage-config.ts` whenever the mock data or the stored data shape changes; saved data with another version is discarded on the next load. The store and the pre-hydration purge script both read that file, so they cannot drift apart.

### Project structure

```
app/
  page.tsx                 Dashboard (agent or manager, by role)
  business-overview/       Owner-level metrics
  leads/                   Lead list
  leads/[id]/              Lead detail
  leads/new/               Create lead
  reminders/               Reminders
  reports/                 Manager reports
  admin/                   Admin review queue
  reset/                   Clears demo data
  api/debug/               Mock lead counts (JSON)
components/
  dashboard/               AgentDashboard, ManagerDashboard
  layout/                  Sidebar (desktop), TopNav (mobile)
  lead-detail/             LeadDetailClient + panels: OfferPanel (buyer offer threads),
                           SellerOfferPanel, PreListingPanel, ListingAgreementPanel,
                           RentalApplicationsPanel, TenantApplicationPanel,
                           RecruitOfferPanel, CoopAgentRow, LeadDetailLoader
  ui/                      Badge, Button, Card, Avatar, StageBadge, Select,
                           EmptyState, ComplianceTag
lib/
  types.ts                 Data model (stage keys, leads, offers, listings, leases…)
  constants.ts             Stage display names, conversion helper, checklists, loss reasons
  business-metrics.ts      GCI estimates and Business Overview metrics
  store.tsx                Client-side store (stands in for the backend)
  storage-config.ts        Storage key + STORE_VERSION shared with the purge script
  mock-data.ts             Fictional demo leads, activities, reminders
  role-context.tsx         Agent / Manager demo role
  contact-attempt.ts, utils.ts
```

## Known limitations

- **No real backend or login.** All data lives in the viewer's browser (`localStorage`). The Agent / Manager switch is a demo toggle, not authentication.
- **Demo data is relative to today.** Dates in `lib/mock-data.ts` are calculated when the page loads, so the dashboards always show recent activity. "Reset Demo" reloads it.
- **GCI figures are estimates** wherever no price is recorded: they fall back to the expected listing price or the midpoint of the lead's budget.
- **Flat-fee commissions** such as "$5,000" aren't parsed; they fall back to the 2.5% listing-side default.
- **No historical snapshots.** Trends are rebuilt from created/updated dates, not stored monthly values.

## 7. Reusable for another client vs client-specific

**Reusable as-is**

- The stage-key model: one internal key per stage, display names per pipeline.
- Per-pipeline conversion points via `getConversionStage()`.
- The three exit paths and their reporting rules (Not Now ≠ won, Inactive = lost, Pause = still active).
- Offer / application threads (several properties or applicants per lead, rounds within each).
- Checklist and auto-reminder patterns tied to stage changes.
- Metrics computed from stage keys, and the Business Overview structure.

**Client-specific — would become configuration**

- **Regulatory compliance steps.** The buyer representation agreement required before an offer, the seller identity check at pre-listing, the agent licence-transfer deadline (join date + 50 days, 60-day rule) and the standard-lease checklist reflect the original client's jurisdiction. In the UI they are tagged *Regulatory compliance step* (`components/ui/ComplianceTag.tsx`, `COMPLIANCE_STEP_LABEL` in `lib/constants.ts`). For another market, the rules, wording and deadlines would move into a per-jurisdiction config.
- **Commission defaults** (`DEFAULT_TOTAL_COMMISSION`, `DEFAULT_SIDE_COMMISSION`, half-month rental fee) in `lib/business-metrics.ts`.
- **Checklist task names and loss reasons** in `lib/constants.ts` (they name the client's back-office system generically today).
- **Lead sources, property types, currency and locale** (`en-CA`, CAD formatting).
- **Which pipelines exist** — e.g. a brokerage without rentals or recruiting would drop those.
