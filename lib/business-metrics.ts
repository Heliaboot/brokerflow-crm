/**
 * Business metrics helpers for the CEO/owner Business Overview page.
 *
 * Commission assumptions (typical market default — set per market; negotiable in practice):
 *   DEFAULT_TOTAL_COMMISSION = 5%  (2.5% listing side / 2.5% buyer side)
 *   DEFAULT_SIDE_COMMISSION  = 2.5% (one side only — what the brokerage earns)
 *   Seller GCI = price × listing-side share — The brokerage earns the listing side only.
 *     "4%" (one number) = total → share 2%; "2.5% + 2.5%" = two sides → share 2.5%.
 *     Fallback when nothing parseable is recorded: DEFAULT_SIDE_COMMISSION = 2.5%.
 *   Rental placements (Landlord/Tenant): half a month's rent as placement fee
 *   when no explicit commission is recorded (matches mock data convention).
 *
 * NOTE for production Supabase build:
 *   True historical trending (e.g. "pipeline value 6 months ago") requires a
 *   monthly snapshot table. Current metrics reconstruct trends only from immutable
 *   fields already on each record (createdAt, updatedAt) — works for lead-count
 *   and closing trends but NOT for point-in-time dollar snapshots.
 */

import type {
  Lead,
  Activity,
  ListingDetails,
  OfferRound,
  AcceptedOffer,
  SellerOfferRound,
  RentalApplication,
  LeaseDetails,
  TenantApplication,
  TenantLeaseDetails,
} from "./types";

export const DEFAULT_TOTAL_COMMISSION = 0.05;
export const DEFAULT_SIDE_COMMISSION = 0.025;

// ── Parsing helpers ────────────────────────────────────────────────────────────

export interface ParsedCommission {
  /** Total commission on the deal, as a decimal (e.g. 0.05). */
  total: number;
  /** Listing-side share — what the brokerage earns on a Seller listing. */
  listingSide: number;
}

/**
 * Parses a recorded listing commission string.
 *   "4%"          → one number = TOTAL commission → total 4%,   listing side 2% (split evenly)
 *   "2.5% + 2.5%" → two numbers = listing side + co-op side → total 5%, listing side 2.5%
 *   "3% + 2%"     → total 5%, listing side 3% (first number is the listing side)
 * Only numbers followed by "%" count. Returns null when unparseable
 * (e.g. "Half month", "$5,000 flat", "TBD") or when the total is over 20%.
 */
export function parseCommission(commission?: string): ParsedCommission | null {
  if (!commission) return null;
  const sides = commission.split("+").map((part) => {
    const m = part.match(/(\d+(?:\.\d+)?)\s*%/);
    return m ? parseFloat(m[1]) / 100 : NaN;
  });
  if (sides.some((s) => isNaN(s) || s < 0)) return null;

  let parsed: ParsedCommission;
  if (sides.length === 1) {
    parsed = { total: sides[0], listingSide: sides[0] / 2 };
  } else if (sides.length === 2) {
    parsed = { total: sides[0] + sides[1], listingSide: sides[0] };
  } else {
    return null;
  }
  if (parsed.total === 0 || parsed.total > 0.2) return null; // sanity: >20% total is not a real commission
  return parsed;
}

/**
 * Listing-side share as a decimal — the brokerage's cut of a recorded Seller
 * commission (see parseCommission). Returns null when unparseable.
 */
export function parseCommissionPercent(commission?: string): number | null {
  return parseCommission(commission)?.listingSide ?? null;
}

/**
 * Parses free-text budget strings like "$850,000 – $1,100,000" or "$2,500/mo".
 * Extracts all $ figures, returns the midpoint if a range.
 * isMonthly: true if the string contains "/mo".
 */
export function parseMoneyMidpoint(
  text?: string
): { value: number; isMonthly: boolean } | null {
  if (!text) return null;
  const isMonthly = /\/mo/i.test(text);
  const nums = [...text.matchAll(/\$?([\d,]+)/g)]
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => !isNaN(n) && n > 0);
  if (nums.length === 0) return null;
  const value = nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
  return { value, isMonthly };
}

// ── Context type passed to all aggregate functions ────────────────────────────

export interface MetricsCtx {
  leads: Lead[];
  activities: Activity[];
  listingDetails: ListingDetails[];
  offerRounds: OfferRound[];
  acceptedOffers: AcceptedOffer[];
  sellerOfferRounds: SellerOfferRound[];
  rentalApplications: RentalApplication[];
  leaseDetails: LeaseDetails[];
  tenantApplications: TenantApplication[];
  tenantLeaseDetails: TenantLeaseDetails[];
}

// ── Per-lead deal value estimation ────────────────────────────────────────────

export interface DealValue {
  price: number;
  gci: number;
  isEstimate: boolean;
}

/**
 * Estimates the deal value and GCI for a single lead.
 * Returns null for Recruit/Other leads (not commission-generating).
 */
export function estimateDealValue(
  lead: Lead,
  ctx: MetricsCtx
): DealValue | null {
  const type = lead.leadType;
  if (!type || type === "Recruit" || type === "Other") return null;

  // ── Seller ──────────────────────────────────────────────────────────────────
  if (type === "Seller") {
    const listing = ctx.listingDetails.find((l) => l.leadId === lead.id);
    const acceptedRound = ctx.sellerOfferRounds.find(
      (r) => r.leadId === lead.id && r.status === "accepted"
    );

    let price: number | null = null;
    let isEstimate = false;
    if (acceptedRound) {
      price = acceptedRound.offerPrice;
    } else if (listing?.expectedListingPrice) {
      price = listing.expectedListingPrice;
      isEstimate = true;
    } else {
      const parsed = parseMoneyMidpoint(lead.budget);
      if (parsed && !parsed.isMonthly) {
        price = parsed.value;
        isEstimate = true;
      }
    }
    if (!price) return null;

    const commissionRate =
      parseCommissionPercent(listing?.commission) ?? DEFAULT_SIDE_COMMISSION;
    return { price, gci: price * commissionRate, isEstimate };
  }

  // ── Buyer / Investor ─────────────────────────────────────────────────────────
  if (type === "Buyer" || type === "Investor") {
    const accepted = ctx.acceptedOffers.find((a) => a.leadId === lead.id);
    const latestRound = ctx.offerRounds
      .filter((r) => r.leadId === lead.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    let price: number | null = null;
    let isEstimate = false;
    if (accepted) {
      price = accepted.acceptedPrice;
    } else if (latestRound) {
      price = latestRound.offerPrice;
      isEstimate = true;
    } else {
      const parsed = parseMoneyMidpoint(lead.budget);
      if (parsed && !parsed.isMonthly) {
        price = parsed.value;
        isEstimate = true;
      }
    }
    if (!price) return null;

    return { price, gci: price * DEFAULT_SIDE_COMMISSION, isEstimate };
  }

  // ── Landlord ─────────────────────────────────────────────────────────────────
  if (type === "Landlord") {
    const lease = ctx.leaseDetails.find((l) => l.leadId === lead.id);
    const approvedApp = ctx.rentalApplications.find(
      (a) => a.leadId === lead.id && a.status === "approved"
    );

    let monthlyRent: number | null = null;
    let isEstimate = false;
    if (lease) {
      monthlyRent = lease.monthlyRent;
    } else if (approvedApp?.offerPrice) {
      monthlyRent = approvedApp.offerPrice;
      isEstimate = true;
    } else {
      const parsed = parseMoneyMidpoint(lead.budget);
      if (parsed && parsed.isMonthly) {
        monthlyRent = parsed.value;
        isEstimate = true;
      }
    }
    if (!monthlyRent) return null;

    return {
      price: monthlyRent * 12,
      gci: monthlyRent * 0.5,
      isEstimate,
    };
  }

  // ── Tenant ───────────────────────────────────────────────────────────────────
  if (type === "Tenant") {
    const lease = ctx.tenantLeaseDetails.find((l) => l.leadId === lead.id);
    const approvedApp = ctx.tenantApplications.find(
      (a) => a.leadId === lead.id && a.status === "approved"
    );

    let monthlyRent: number | null = null;
    let isEstimate = false;
    if (lease) {
      monthlyRent = lease.monthlyRent;
    } else if (approvedApp?.monthlyRent) {
      monthlyRent = approvedApp.monthlyRent;
      isEstimate = true;
    } else {
      const parsed = parseMoneyMidpoint(lead.budget);
      if (parsed && parsed.isMonthly) {
        monthlyRent = parsed.value;
        isEstimate = true;
      }
    }
    if (!monthlyRent) return null;

    return {
      price: monthlyRent * 12,
      gci: monthlyRent * 0.5,
      isEstimate,
    };
  }

  return null;
}

// ── Aggregate functions ────────────────────────────────────────────────────────

/**
 * A real closed deal. "Not Now" exits also set stage = "Closed" (with
 * closeReason "closed_elsewhere") so the lead drops out of the active pipeline
 * and into nurture — those are NOT won deals and must not count toward closed
 * deals, closed GCI, conversion rate or days-to-close.
 */
export function isClosedWon(lead: Lead): boolean {
  return lead.stage === "Closed" && lead.closeReason !== "closed_elsewhere";
}

export interface ActivePipelineValue {
  totalGci: number;
  includedCount: number;
  excludedCount: number;
  totalActive: number;
}

/** Sum of estimated GCI across all non-Closed/Lost leads (excluding Recruit/Other). */
export function getActivePipelineValue(ctx: MetricsCtx): ActivePipelineValue {
  const activeLeads = ctx.leads.filter(
    (l) => l.stage !== "Closed" && l.stage !== "Lost"
  );
  let totalGci = 0;
  let includedCount = 0;
  let excludedCount = 0;

  for (const lead of activeLeads) {
    const dv = estimateDealValue(lead, ctx);
    if (dv) {
      totalGci += dv.gci;
      includedCount++;
    } else {
      excludedCount++;
    }
  }

  return { totalGci, includedCount, excludedCount, totalActive: activeLeads.length };
}

export interface ClosedDeals {
  count: number;
  totalGci: number;
}

/** Count + summed GCI of closed-won leads (excludes "Not Now"), optionally filtered to last N days by updatedAt. */
export function getClosedDeals(ctx: MetricsCtx, sinceDays?: number): ClosedDeals {
  let closed = ctx.leads.filter(isClosedWon);
  if (sinceDays) {
    const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
    closed = closed.filter((l) => new Date(l.updatedAt).getTime() >= cutoff);
  }
  let totalGci = 0;
  for (const lead of closed) {
    const dv = estimateDealValue(lead, ctx);
    if (dv) totalGci += dv.gci;
  }
  return { count: closed.length, totalGci };
}

export interface NewLeadsTrend {
  thisMonth: number;
  lastMonth: number;
  percentChange: number | null;
}

/** Lead count in current calendar month vs previous, plus % change. */
export function getNewLeadsTrend(ctx: MetricsCtx): NewLeadsTrend {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  const thisMonth = ctx.leads.filter(
    (l) => new Date(l.createdAt).getTime() >= thisMonthStart
  ).length;
  const lastMonth = ctx.leads.filter(
    (l) =>
      new Date(l.createdAt).getTime() >= lastMonthStart &&
      new Date(l.createdAt).getTime() < thisMonthStart
  ).length;

  const percentChange =
    lastMonth === 0 ? null : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);

  return { thisMonth, lastMonth, percentChange };
}

export interface ConversionRate {
  rate: number | null;
  closed: number;
  lost: number;
}

/**
 * Closed-won ÷ (Closed-won + Lost) as whole-number percent.
 * "Not Now" leads are excluded from both sides — they are in nurture, not won or lost.
 */
export function getConversionRate(ctx: Pick<MetricsCtx, "leads">): ConversionRate {
  const closed = ctx.leads.filter(isClosedWon).length;
  const lost = ctx.leads.filter((l) => l.stage === "Lost").length;
  const total = closed + lost;
  return {
    rate: total === 0 ? null : Math.round((closed / total) * 100),
    closed,
    lost,
  };
}

/** Leads stuck in New/Contacted with no recent contact — same logic as ManagerDashboard. */
export function getStuckDealsCount(ctx: MetricsCtx): number {
  return ctx.leads.filter((l) => {
    if (!["New", "Contacted"].includes(l.stage)) return false;
    if (l.qualificationStatus === "Not Qualified") return false;
    if (!l.lastContactedAt) {
      const hoursOld =
        (Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
      return hoursOld > 24;
    }
    const daysOld =
      (Date.now() - new Date(l.lastContactedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    return daysOld > 7;
  }).length;
}

export interface AvgDaysToClose {
  avgDays: number | null;
  sampleSize: number;
}

/** Mean days from createdAt to updatedAt across closed-won leads (excludes "Not Now"). */
export function getAvgDaysToClose(ctx: Pick<MetricsCtx, "leads">): AvgDaysToClose {
  const closed = ctx.leads.filter(isClosedWon);
  if (closed.length === 0) return { avgDays: null, sampleSize: 0 };
  const days = closed.map(
    (l) =>
      (new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const avg = days.reduce((s, d) => s + d, 0) / days.length;
  return { avgDays: Math.round(avg), sampleSize: closed.length };
}

export interface SourcePipelineValue {
  source: string;
  totalPrice: number;
  count: number;
}

/** Active (non-Closed/Lost) pipeline grouped by lead.source, summed by price (not GCI). */
export function getPipelineValueBySource(ctx: MetricsCtx): SourcePipelineValue[] {
  const active = ctx.leads.filter(
    (l) => l.stage !== "Closed" && l.stage !== "Lost"
  );
  const map: Record<string, { totalPrice: number; count: number }> = {};
  for (const lead of active) {
    const dv = estimateDealValue(lead, ctx);
    if (!dv) continue;
    const src = lead.source || "Unknown";
    if (!map[src]) map[src] = { totalPrice: 0, count: 0 };
    map[src].totalPrice += dv.price;
    map[src].count++;
  }
  return Object.entries(map)
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.totalPrice - a.totalPrice);
}

export interface AvgFirstContactHours {
  avgHours: number | null;
  sampleSize: number;
}

/** Average hours from lead.createdAt to first contact_attempt activity. */
export function getAvgFirstContactHours(ctx: Pick<MetricsCtx, "leads" | "activities">): AvgFirstContactHours {
  const hours: number[] = [];
  for (const lead of ctx.leads) {
    const firstContact = ctx.activities
      .filter((a) => a.leadId === lead.id && a.type === "contact_attempt")
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];
    if (!firstContact) continue;
    const h =
      (new Date(firstContact.createdAt).getTime() -
        new Date(lead.createdAt).getTime()) /
      (1000 * 60 * 60);
    if (h >= 0) hours.push(h);
  }
  if (hours.length === 0) return { avgHours: null, sampleSize: 0 };
  const avg = hours.reduce((s, h) => s + h, 0) / hours.length;
  return { avgHours: Math.round(avg * 10) / 10, sampleSize: hours.length };
}
