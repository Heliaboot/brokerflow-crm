"use client";

import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import {
  getActivePipelineValue,
  getClosedDeals,
  getNewLeadsTrend,
  getConversionRate,
  getStuckDealsCount,
  getAvgDaysToClose,
  getPipelineValueBySource,
  getAvgFirstContactHours,
  type MetricsCtx,
} from "@/lib/business-metrics";

const fmt = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const fmtFull = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export default function BusinessOverviewPage() {
  const store = useStore();

  const ctx: MetricsCtx = {
    leads: store.leads,
    activities: store.activities,
    listingDetails: store.listingDetails,
    offerRounds: store.offerRounds,
    acceptedOffers: store.acceptedOffers,
    sellerOfferRounds: store.sellerOfferRounds,
    rentalApplications: store.rentalApplications,
    leaseDetails: store.leaseDetails,
    tenantApplications: store.tenantApplications,
    tenantLeaseDetails: store.tenantLeaseDetails,
  };

  const pipeline = getActivePipelineValue(ctx);
  const closed90 = getClosedDeals(ctx, 90);
  const closedAll = getClosedDeals(ctx, undefined);
  const trend = getNewLeadsTrend(ctx);
  const conversion = getConversionRate(ctx);
  const stuck = getStuckDealsCount(ctx);
  const avgDays = getAvgDaysToClose(ctx);
  const bySource = getPipelineValueBySource(ctx);
  const firstContact = getAvgFirstContactHours(ctx);

  const totalLeads = store.leads.length;
  const maxSourceValue = Math.max(...bySource.map((s) => s.totalPrice), 1);

  const trendLabel =
    trend.percentChange === null
      ? `${trend.thisMonth} this month (no prior month data)`
      : trend.percentChange >= 0
      ? `↑ ${trend.percentChange}% vs last month (${trend.lastMonth})`
      : `↓ ${Math.abs(trend.percentChange)}% vs last month (${trend.lastMonth})`;

  const kpiCards = [
    {
      label: "Active Pipeline GCI",
      value: fmt.format(pipeline.totalGci),
      context: `${pipeline.includedCount} of ${pipeline.totalActive} active leads valued · ${pipeline.excludedCount} excluded (no price data)`,
      color: "text-emerald-600",
    },
    {
      label: "GCI Closed (Last 90 Days)",
      value: fmt.format(closed90.totalGci),
      context: `${closed90.count} deal${closed90.count !== 1 ? "s" : ""} · ${closedAll.count} total all-time`,
      color: "text-emerald-700",
    },
    {
      label: "New Leads This Month",
      value: String(trend.thisMonth),
      context: trendLabel,
      color: "text-blue-600",
    },
    {
      label: "Conversion Rate",
      value: conversion.rate !== null ? `${conversion.rate}%` : "—",
      context:
        conversion.rate !== null
          ? `${conversion.closed} closed · ${conversion.lost} inactive`
          : "No closed or inactive leads yet",
      color: "text-violet-600",
    },
    {
      label: "Stuck Leads",
      value: String(stuck),
      context: "New/Contacted with no contact in 7+ days",
      color: stuck > 0 ? "text-amber-600" : "text-zinc-400",
    },
    {
      label: "Avg Days to Close",
      value: avgDays.avgDays !== null ? `${avgDays.avgDays}d` : "—",
      context:
        avgDays.sampleSize === 0
          ? "No closed deals yet"
          : avgDays.sampleSize < 5
          ? `n=${avgDays.sampleSize} — will get more reliable with more closes`
          : `Based on ${avgDays.sampleSize} closed deals`,
      color: "text-zinc-900",
    },
    {
      label: "Avg First Contact",
      value: firstContact.avgHours !== null ? `${firstContact.avgHours}h` : "—",
      context:
        firstContact.sampleSize === 0
          ? "No contact attempts logged yet"
          : `${firstContact.sampleSize} lead${firstContact.sampleSize !== 1 ? "s" : ""} with a logged first contact`,
      color: "text-zinc-900",
    },
    {
      label: "Total Leads",
      value: String(totalLeads),
      context: `${closedAll.count} closed · ${store.leads.filter((l) => l.stage === "Lost").length} inactive`,
      color: "text-zinc-900",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Business Overview</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          CEO/owner strategic view · pipeline value, GCI, and growth trends
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-blue-500 text-base shrink-0 mt-0.5">ℹ</span>
        <p className="text-sm text-blue-800">
          Pipeline value and GCI figures are estimates using a standard 2.5%/2.5%
          commission split where a lead doesn&apos;t have its own recorded price or commission.
          With <strong>{totalLeads}</strong> lead{totalLeads !== 1 ? "s" : ""} and{" "}
          <strong>{closedAll.count}</strong> closed to date, treat trend figures as directional
          until more deals close.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, context, color }) => (
          <Card key={label} padding="md">
            <p className="text-xs text-zinc-400 mb-1 leading-tight">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-zinc-400 mt-1 leading-snug">{context}</p>
          </Card>
        ))}
      </div>

      {/* Pipeline value by source */}
      <Card padding="md">
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">
          Active Pipeline Value by Source
        </h2>
        <p className="text-xs text-zinc-400 mb-4">
          Total estimated deal size (not GCI) for all active leads per acquisition channel
        </p>
        {bySource.length === 0 ? (
          <p className="text-sm text-zinc-400">No active leads with price data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {bySource.map(({ source, totalPrice, count }) => (
              <div key={source} className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 w-32 shrink-0 truncate">{source}</span>
                <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(totalPrice / maxSourceValue) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-20 text-right shrink-0">
                  {fmt.format(totalPrice)}
                </span>
                <span className="text-xs text-zinc-400 w-12 text-right shrink-0">
                  {count} lead{count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-zinc-300 mt-4">
          Hover figures: {bySource.map((s) => `${s.source} ${fmtFull.format(s.totalPrice)}`).join(" · ")}
        </p>
      </Card>
    </div>
  );
}
