"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StageBadge, QualificationBadge, FollowUpBadge } from "@/components/ui/StageBadge";
import { Avatar } from "@/components/ui/Avatar";
import { PIPELINE_STAGES } from "@/lib/constants";
import { fullName, relativeTime } from "@/lib/utils";
import { useRole, AGENT_NAME } from "@/lib/role-context";
import { useStore } from "@/lib/store";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// useSearchParams() requires a Suspense boundary in the App Router.
// The inner component reads search params; the outer page wraps it.
function LeadsContent() {
  const { role } = useRole();
  const { leads } = useStore();
  const searchParams = useSearchParams();
  const stageFilter = searchParams.get("stage");

  const baseLeads = role === "agent"
    ? leads.filter((l) => l.assignedAgent === AGENT_NAME)
    : leads;

  const displayLeads = stageFilter
    ? baseLeads.filter((l) => l.stage === stageFilter)
    : baseLeads;

  const isAgent = role === "agent";

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {isAgent ? "My Leads" : "All Leads"}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {displayLeads.length} lead{displayLeads.length !== 1 ? "s" : ""}
            {stageFilter ? ` in ${stageFilter}` : ""}
            {isAgent ? " assigned to you" : " across all agents"}
          </p>
        </div>
        <Link
          href="/leads/new"
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors"
        >
          + New Lead
        </Link>
      </div>

      {/* Stage filter */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-500 mr-1">Stage:</span>
          <Link
            href="/leads"
            className={cn(
              "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
              !stageFilter
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            )}
          >
            All
          </Link>
          {PIPELINE_STAGES.map((stage) => {
            const active = stageFilter === stage;
            return (
              <Link
                key={stage}
                href={`/leads?stage=${encodeURIComponent(stage)}`}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full transition-colors",
                  active
                    ? "bg-zinc-900 text-white font-medium"
                    : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                )}
              >
                {stage}
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Lead table */}
      <Card padding="none">
        {displayLeads.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-zinc-400">No leads found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                    Lead
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden md:table-cell">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden lg:table-cell">
                    Qualification
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden lg:table-cell">
                    Follow-Up
                  </th>
                  {!isAgent && (
                    <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden md:table-cell">
                      Agent
                    </th>
                  )}
                  <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden md:table-cell">
                    Last Contact
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {displayLeads.map((lead) => {
                  const noContact = lead.stage === "New" && !lead.lastContactedAt;
                  return (
                    <tr
                      key={lead.id}
                      className={cn(
                        "hover:bg-zinc-50 transition-colors",
                        noContact && "bg-red-50/40"
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(lead)} size="sm" />
                          <div>
                            <p className="font-medium text-zinc-900">{fullName(lead)}</p>
                            <p className="text-xs text-zinc-400">{lead.email || lead.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <StageBadge stage={lead.stage} leadType={lead.leadType} />
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <QualificationBadge status={lead.qualificationStatus} />
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <FollowUpBadge status={lead.followUpStatus} />
                      </td>
                      {!isAgent && (
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Avatar name={lead.assignedAgent} size="sm" />
                            <span className="text-sm text-zinc-700">{lead.assignedAgent}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className={cn(
                          "text-sm",
                          noContact ? "text-red-500 font-medium" : "text-zinc-500"
                        )}>
                          {lead.lastContactedAt ? relativeTime(lead.lastContactedAt) : "Never"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-xs text-zinc-400 hover:text-zinc-800 font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto py-10 text-sm text-zinc-400">Loading leads…</div>}>
      <LeadsContent />
    </Suspense>
  );
}
