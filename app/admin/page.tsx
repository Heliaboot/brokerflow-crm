import Link from "next/link";
import { mockLeads } from "@/lib/mock-data";
import { Card } from "@/components/ui/Card";
import { StageBadge, QualificationBadge, FollowUpBadge } from "@/components/ui/StageBadge";
import { Avatar } from "@/components/ui/Avatar";
import { fullName, formatDate } from "@/lib/utils";

const pendingReview = mockLeads.filter(
  (l) => l.qualificationStatus === "Pending Review"
);

const stuckLeads = mockLeads.filter(
  (l) =>
    ["New", "Contacted"].includes(l.stage) &&
    l.qualificationStatus !== "Not Qualified" &&
    l.lastContactedAt &&
    new Date().getTime() - new Date(l.lastContactedAt).getTime() > 7 * 24 * 60 * 60 * 1000
);

const doNotContactLeads = mockLeads.filter(
  (l) => l.followUpStatus === "Do Not Contact"
);

export default function AdminQueuePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Admin Review Queue</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Leads requiring attention, qualification, or admin review.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{pendingReview.length}</p>
          <p className="text-xs text-zinc-400 mt-0.5">awaiting qualification</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">Stuck Leads</p>
          <p className="text-2xl font-bold text-red-500">{stuckLeads.length}</p>
          <p className="text-xs text-zinc-400 mt-0.5">no contact in 7+ days</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-zinc-400 mb-1">Do Not Contact</p>
          <p className="text-2xl font-bold text-zinc-400">{doNotContactLeads.length}</p>
          <p className="text-xs text-zinc-400 mt-0.5">opted out</p>
        </Card>
      </div>

      {/* Pending qualification */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-700">
            Pending Qualification
          </h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
            {pendingReview.length}
          </span>
        </div>
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Lead</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Stage</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden md:table-cell">Agent</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden md:table-cell">Created</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pendingReview.map((lead) => (
                <tr key={lead.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName(lead)} size="sm" />
                      <div>
                        <p className="font-medium text-zinc-900">{fullName(lead)}</p>
                        <p className="text-xs text-zinc-400">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StageBadge stage={lead.stage} />
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar name={lead.assignedAgent} size="sm" />
                      <span className="text-sm text-zinc-700">{lead.assignedAgent}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell text-sm text-zinc-500">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors font-medium">
                        Qualify
                      </button>
                      <button className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors font-medium">
                        Disqualify
                      </button>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-xs px-2.5 py-1 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Stuck leads */}
      {stuckLeads.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <h2 className="text-sm font-semibold text-zinc-700">Stuck — No Contact in 7+ Days</h2>
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {stuckLeads.length}
            </span>
          </div>
          <Card padding="none">
            <ul className="divide-y divide-zinc-100">
              {stuckLeads.map((lead) => (
                <li key={lead.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50">
                  <Avatar name={fullName(lead)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{fullName(lead)}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StageBadge stage={lead.stage} />
                      <FollowUpBadge status={lead.followUpStatus} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-zinc-400">Assigned to</p>
                    <p className="text-xs font-medium text-zinc-700">{lead.assignedAgent}</p>
                  </div>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-xs text-zinc-400 hover:text-zinc-800 font-medium ml-2 shrink-0"
                  >
                    View →
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Do not contact */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-zinc-300" />
          <h2 className="text-sm font-semibold text-zinc-700">Do Not Contact</h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
            {doNotContactLeads.length}
          </span>
        </div>
        <Card padding="none">
          <ul className="divide-y divide-zinc-100">
            {doNotContactLeads.map((lead) => (
              <li key={lead.id} className="flex items-center gap-4 px-5 py-4 opacity-60">
                <Avatar name={fullName(lead)} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-700">{fullName(lead)}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {lead.email} · {lead.source}
                  </p>
                </div>
                <QualificationBadge status={lead.qualificationStatus} />
                <Link
                  href={`/leads/${lead.id}`}
                  className="text-xs text-zinc-400 hover:text-zinc-800 font-medium ml-2"
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
