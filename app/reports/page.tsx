"use client";

import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { isClosedWon } from "@/lib/business-metrics";
import { getReportMetrics } from "@/lib/report-metrics";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { STAGE_COLORS, LEAD_SOURCES, PIPELINE_STAGES } from "@/lib/constants";
import type { PipelineStage } from "@/lib/types";

export default function ReportsPage() {
  const { leads, activities } = useStore();
  const now = useNow();
  const m = getReportMetrics(leads, activities, now);

  // ── Derived stats (single source of truth) ────────────────────────────────
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.qualificationStatus === "Qualified").length;
  const pendingLeads   = leads.filter((l) => l.qualificationStatus === "Pending Review").length;
  const notQualified   = leads.filter((l) => l.qualificationStatus === "Not Qualified").length;

  // Pipeline by stage — derives counts live; "Lost" stage key → "Inactive" label.
  // "Not Now" leads also sit in the Closed stage key, so they get their own
  // "Not Now (nurture)" row instead of inflating Closed.
  const pipelineByStage = [
    ...PIPELINE_STAGES.map((stage) => ({
      key: stage,
      label: stage === "Lost" ? "Inactive" : stage,
      color: STAGE_COLORS[stage as PipelineStage],
      count: stage === "Closed"
        ? leads.filter(isClosedWon).length
        : leads.filter((l) => l.stage === stage).length,
    })),
    { key: "nurture", label: "Not Now (nurture)", color: "bg-indigo-50 text-indigo-600", count: m.nurture },
  ].filter((s) => s.count > 0);

  const maxStageCount = Math.max(...pipelineByStage.map((s) => s.count), 1);

  // Leads by source — unknown/invalid values collapsed into "Other"
  const validSources = new Set(LEAD_SOURCES);
  const sourceCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const src = l.source && validSources.has(l.source) ? l.source : "Other";
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
  });
  const leadsBySource = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const maxSourceCount = Math.max(...leadsBySource.map((s) => s.count), 1);

  // ── Stat cards ────────────────────────────────────────────────────────────
  const statCards = [
    { label: "Total Leads",       value: totalLeads,                              color: "text-zinc-900"    },
    { label: "Qualified Leads",   value: qualifiedLeads,                          color: "text-emerald-600" },
    { label: "Conversion Rate",   value: m.conversionRate === null ? "—" : `${m.conversionRate}%`, color: "text-blue-600"    },
    { label: "Avg. Days to Close",value: m.avgDaysToClose === null ? "—" : `${m.avgDaysToClose}d`, color: "text-violet-600"  },
    { label: "Closed This Month", value: m.closedWonThisMonth,                    color: "text-emerald-700" },
    { label: "Active Follow-Ups", value: m.activeFollowUps,                       color: "text-amber-600"   },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Reports</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Overview of pipeline performance · {totalLeads} total leads
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(({ label, value, color }) => (
          <Card key={label} padding="md">
            <p className="text-xs text-zinc-400 mb-1 leading-tight">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Pipeline by stage */}
        <Card padding="md">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Leads by Pipeline Stage</h2>
          <div className="space-y-2.5">
            {pipelineByStage.map(({ key, label, color, count }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-36 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                    {label}
                  </span>
                </div>
                <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-zinc-700 transition-all"
                    style={{ width: `${(count / maxStageCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-4 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Leads by source */}
        <Card padding="md">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Leads by Source</h2>
          <div className="space-y-2.5">
            {leadsBySource.map(({ source, count }) => (
              <div key={source} className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 w-28 shrink-0 truncate">{source}</span>
                <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${(count / maxSourceCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-4 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Leads by agent */}
        <Card padding="md">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Leads by Agent</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left pb-2 text-xs font-medium text-zinc-400">Agent</th>
                  <th className="text-right pb-2 text-xs font-medium text-zinc-400">Leads</th>
                  <th className="text-right pb-2 text-xs font-medium text-zinc-400">Closed</th>
                  <th className="text-right pb-2 text-xs font-medium text-zinc-400">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {m.byAgent.map(({ agent, leads: count, closedWon, closeRate }) => (
                  <tr key={agent}>
                    <td className="py-2.5 text-sm text-zinc-800">{agent}</td>
                    <td className="py-2.5 text-right text-sm text-zinc-600">{count}</td>
                    <td className="py-2.5 text-right text-sm text-emerald-600 font-medium">{closedWon}</td>
                    <td className="py-2.5 text-right text-sm text-zinc-500">
                      {closeRate === null ? "—" : `${closeRate}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Assignment overview */}
        <Card padding="md">
          <h2 className="text-sm font-semibold text-zinc-900 mb-1">Assignment Overview</h2>
          <p className="text-xs text-zinc-400 mb-4">Lead ownership and first-contact speed by agent</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-900">{m.totalLeads}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Total assigned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{m.awaitingFirstContact}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Awaiting first contact</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {m.avgHoursToFirstContact === null ? "—" : `${m.avgHoursToFirstContact}h`}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">Avg. hrs to first contact</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left pb-2 text-xs font-medium text-zinc-400">Agent</th>
                <th className="text-right pb-2 text-xs font-medium text-zinc-400">Assigned</th>
                <th className="text-right pb-2 text-xs font-medium text-zinc-400">Contacted</th>
                <th className="text-right pb-2 text-xs font-medium text-zinc-400">Avg. hrs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {m.byAgent.map(({ agent, assigned, contacted, avgHoursToContact }) => (
                <tr key={agent}>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={agent} size="sm" />
                      <span className="text-sm text-zinc-800">{agent}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-sm text-zinc-600">{assigned}</td>
                  <td className="py-2.5 text-right text-sm text-emerald-600 font-medium">{contacted}</td>
                  <td className="py-2.5 text-right text-sm text-zinc-500">
                    {avgHoursToContact != null ? `${avgHoursToContact}h` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Qualification breakdown */}
        <Card padding="md">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Qualification Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: "Qualified",     count: qualifiedLeads, color: "bg-emerald-500", text: "text-emerald-700" },
              { label: "Pending Review",count: pendingLeads,   color: "bg-amber-400",   text: "text-amber-700"   },
              { label: "Not Qualified", count: notQualified,   color: "bg-red-400",     text: "text-red-600"     },
            ].map(({ label, count, color, text }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 w-28 shrink-0">{label}</span>
                <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${color}`}
                    style={{ width: `${totalLeads > 0 ? (count / totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <span className={`text-xs font-medium w-6 text-right shrink-0 ${text}`}>{count}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{qualifiedLeads}</p>
              <p className="text-xs text-zinc-400">Qualified</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{pendingLeads}</p>
              <p className="text-xs text-zinc-400">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{notQualified}</p>
              <p className="text-xs text-zinc-400">Not Qualified</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
