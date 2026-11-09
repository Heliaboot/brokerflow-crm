"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { StageBadge, QualificationBadge } from "@/components/ui/StageBadge";
import { Avatar } from "@/components/ui/Avatar";
import { PIPELINE_STAGES, STAGE_COLORS, CONVERSION_STAGE } from "@/lib/constants";
import { fullName, formatDate } from "@/lib/utils";
import { MANAGER_NAME } from "@/lib/role-context";
import { useNow } from "@/lib/use-now";
import { isClosedWon } from "@/lib/business-metrics";
import { getReportMetrics } from "@/lib/report-metrics";

export function ManagerDashboard() {
  const { leads, activities } = useStore();
  const now = useNow();
  const m = getReportMetrics(leads, activities, now);

  const pendingReview = leads.filter((l) => l.qualificationStatus === "Pending Review");

  const stuckLeads = leads.filter((l) => {
    if (!["New", "Contacted"].includes(l.stage)) return false;
    if (l.qualificationStatus === "Not Qualified") return false;
    if (!l.lastContactedAt) {
      const hoursOld = (now - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
      return hoursOld > 24;
    }
    const daysOld = (now - new Date(l.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysOld > 7;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Team Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {MANAGER_NAME} · All agents · {leads.length} total leads
          </p>
        </div>
        <Link
          href="/leads/new"
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors"
        >
          + New Lead
        </Link>
      </div>

      {/* Stuck leads alert */}
      {stuckLeads.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-amber-500 text-base shrink-0">⚠</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {stuckLeads.length} lead{stuckLeads.length !== 1 ? "s" : ""} stuck — no contact in 7+ days
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {stuckLeads.map((l) => fullName(l)).join(", ")}
            </p>
          </div>
          <Link href="/admin" className="text-xs text-amber-700 font-medium hover:underline shrink-0">
            Review →
          </Link>
        </div>
      )}

      {/* KPI stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">Total Leads</p>
          <p className="text-2xl font-bold text-zinc-900">{m.totalLeads}</p>
          <p className="text-xs text-zinc-400 mt-0.5">across all agents</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">Qualified</p>
          <p className="text-2xl font-bold text-emerald-600">{m.qualifiedLeads}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{m.conversionRate === null ? "no closes yet" : `${m.conversionRate}% conversion`}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">Pending Review</p>
          <p className={`text-2xl font-bold ${pendingReview.length > 0 ? "text-amber-500" : "text-zinc-400"}`}>
            {pendingReview.length}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">need qualification</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">Closed This Month</p>
          <p className="text-2xl font-bold text-violet-600">{m.closedWonThisMonth}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{m.avgDaysToClose === null ? "no closes yet" : `avg. ${m.avgDaysToClose}d to close`}</p>
        </Card>
      </div>

      {/* Pipeline overview */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Pipeline Overview</h2>
          <Link href="/leads" className="text-xs text-zinc-400 hover:text-zinc-700">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
          {PIPELINE_STAGES.map((stage) => {
            // Closed counts closed-won only; "Not Now" leads (also stage Closed) are nurture
            const count = stage === "Closed"
              ? leads.filter(isClosedWon).length
              : leads.filter((l) => l.stage === stage).length;
            const isConversion = stage === CONVERSION_STAGE;
            return (
              <Link
                key={stage}
                href={`/leads?stage=${encodeURIComponent(stage)}`}
                className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div className={`text-lg font-bold ${count > 0 ? "text-zinc-900" : "text-zinc-300"}`}>
                  {count}
                </div>
                <div className="text-center">
                  <span className={`text-[10px] leading-tight font-medium px-1.5 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
                    {stage}
                  </span>
                  {isConversion && (
                    <p className="text-[9px] text-amber-600 mt-0.5 font-medium">conversion</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Agent performance */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">Agent Performance</h2>
            <Link href="/reports" className="text-xs text-zinc-400 hover:text-zinc-700">
              Full report →
            </Link>
          </div>
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
              {m.byAgent.map(({ agent, leads: count, closedWon: closed, closeRate }) => (
                <tr key={agent}>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={agent} size="sm" />
                      <span className="text-sm text-zinc-800">{agent}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-sm text-zinc-600">{count}</td>
                  <td className="py-2.5 text-right text-sm text-emerald-600 font-medium">{closed}</td>
                  <td className="py-2.5 text-right text-sm text-zinc-500">
                    {closeRate === null ? "—" : `${closeRate}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Pending qualification */}
        <Card padding="none">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Pending Qualification</h2>
            <Link href="/admin" className="text-xs text-zinc-400 hover:text-zinc-700">
              Admin queue →
            </Link>
          </div>
          {pendingReview.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-400 text-center">All leads are reviewed.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {pendingReview.slice(0, 5).map((lead) => (
                <li key={lead.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar name={fullName(lead)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{fullName(lead)}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {lead.assignedAgent} · {lead.stage}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium transition-colors">
                      Qualify
                    </button>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-xs px-2 py-1 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent activity across all leads */}
      <Card padding="none">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">All Leads — Recent Activity</h2>
          <Link href="/leads" className="text-xs text-zinc-400 hover:text-zinc-700">
            View all →
          </Link>
        </div>
        <ul className="divide-y divide-zinc-100">
          {[...leads]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 6)
            .map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                >
                  <Avatar name={fullName(lead)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{fullName(lead)}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {lead.assignedAgent} · {formatDate(lead.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <QualificationBadge status={lead.qualificationStatus} />
                    <StageBadge stage={lead.stage} />
                  </div>
                </Link>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}
