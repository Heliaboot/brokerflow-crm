"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { StageBadge, FollowUpBadge } from "@/components/ui/StageBadge";
import { Avatar } from "@/components/ui/Avatar";
import { PIPELINE_STAGES, STAGE_COLORS, CONVERSION_STAGE } from "@/lib/constants";
import { fullName, relativeTime, formatDate } from "@/lib/utils";
import { AGENT_NAME } from "@/lib/role-context";
import { useNow } from "@/lib/use-now";
import { isClosedWon } from "@/lib/business-metrics";

export function AgentDashboard() {
  const { leads, reminders } = useStore();
  const now = useNow();

  const myLeads = leads.filter((l) => l.assignedAgent === AGENT_NAME);
  const myReminders = reminders.filter((r) => r.assignedTo === AGENT_NAME && !r.completed);

  const responseAlerts = myLeads.filter((l) => {
    if (l.stage !== "New") return false;
    if (l.lastContactedAt) return false;
    const hoursOld = (now - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursOld > 1;
  });

  const stuckLeads = myLeads.filter((l) => {
    if (!["New", "Contacted"].includes(l.stage)) return false;
    if (!l.lastContactedAt) return false;
    const daysOld = (now - new Date(l.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysOld > 7;
  });

  const activeLeads = myLeads.filter((l) => !["Closed", "Lost"].includes(l.stage));

  const upcomingReminders = [...myReminders].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const recentLeads = [...myLeads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const totalAlerts = responseAlerts.length + stuckLeads.length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">My Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {AGENT_NAME} · {activeLeads.length} active lead{activeLeads.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/leads/new"
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors"
        >
          + New Lead
        </Link>
      </div>

      {/* Alerts */}
      {totalAlerts > 0 && (
        <div className="space-y-2">
          {responseAlerts.map((lead) => {
            const hoursOld = Math.round(
              (now - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60)
            );
            const daysOld = Math.floor(hoursOld / 24);
            const timeLabel = daysOld >= 1 ? `${daysOld}d` : `${hoursOld}h`;
            return (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-red-100 transition-colors">
                  <span className="text-red-500 text-base shrink-0">⚠</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800">
                      {fullName(lead)} — no first contact
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Waiting {timeLabel} for outreach · {lead.stage} · {lead.source}
                    </p>
                  </div>
                  <span className="text-xs text-red-500 shrink-0">Contact now →</span>
                </div>
              </Link>
            );
          })}

          {stuckLeads.map((lead) => {
            const daysOld = Math.floor(
              (now - new Date(lead.lastContactedAt!).getTime()) / (1000 * 60 * 60 * 24)
            );
            return (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-amber-100 transition-colors">
                  <span className="text-amber-500 text-base shrink-0">⚠</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-800">
                      {fullName(lead)} — no contact in {daysOld} days
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {lead.stage} · Last contact {formatDate(lead.lastContactedAt!)}
                    </p>
                  </div>
                  <span className="text-xs text-amber-600 shrink-0">Follow up →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">My Active Leads</p>
          <p className="text-2xl font-bold text-zinc-900">{activeLeads.length}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">Needs Contact</p>
          <p className={`text-2xl font-bold ${totalAlerts > 0 ? "text-red-500" : "text-zinc-400"}`}>
            {totalAlerts}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">Open Reminders</p>
          <p className="text-2xl font-bold text-amber-600">{upcomingReminders.length}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">In Active Search</p>
          <p className="text-2xl font-bold text-emerald-600">
            {myLeads.filter((l) => l.stage === CONVERSION_STAGE).length}
          </p>
        </Card>
      </div>

      {/* My pipeline */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 id="pipeline" className="scroll-mt-24 text-sm font-semibold text-zinc-900">My Pipeline</h2>
          <Link href="/leads" className="text-xs text-zinc-400 hover:text-zinc-700">
            View all →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.filter((s) => s !== "Lost").map((stage) => {
            // Closed counts closed-won only; "Not Now" leads (also stage Closed) are nurture
            const count = stage === "Closed"
              ? myLeads.filter(isClosedWon).length
              : myLeads.filter((l) => l.stage === stage).length;
            const isConversion = stage === CONVERSION_STAGE;
            return (
              <Link
                key={stage}
                href={`/leads?stage=${encodeURIComponent(stage)}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
              >
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
                  {stage}
                </span>
                <span className={`text-sm font-bold ${count > 0 ? "text-zinc-900" : "text-zinc-300"}`}>
                  {count}
                </span>
                {isConversion && count > 0 && (
                  <span className="text-[10px] text-amber-600 font-medium">★</span>
                )}
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Upcoming reminders */}
        <Card padding="none">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">My Reminders</h2>
            <Link href="/reminders" className="text-xs text-zinc-400 hover:text-zinc-700">
              View all →
            </Link>
          </div>
          {upcomingReminders.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-400 text-center">No open reminders.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {upcomingReminders.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                    r.priority === "high" ? "bg-red-500"
                    : r.priority === "medium" ? "bg-amber-400"
                    : "bg-zinc-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 leading-snug">{r.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {r.leadName} · Due {formatDate(r.dueDate)}
                    </p>
                  </div>
                  <FollowUpBadge status={r.followUpStatus} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* My leads */}
        <Card padding="none">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">My Leads</h2>
            <Link href="/leads" className="text-xs text-zinc-400 hover:text-zinc-700">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100">
            {recentLeads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                >
                  <Avatar name={fullName(lead)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{fullName(lead)}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{relativeTime(lead.updatedAt)}</p>
                  </div>
                  <StageBadge stage={lead.stage} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
