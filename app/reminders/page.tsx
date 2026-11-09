"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { FollowUpBadge } from "@/components/ui/StageBadge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils";
import { useStore } from "@/lib/store";

const priorityLabel: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityColor: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-zinc-300",
};

function dateFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default function RemindersPage() {
  const { reminders, completeReminder, snoozeReminder } = useStore();

  const open = reminders.filter((r) => !r.completed);
  const done = reminders.filter((r) => r.completed);

  const grouped = {
    high: open.filter((r) => r.priority === "high"),
    medium: open.filter((r) => r.priority === "medium"),
    low: open.filter((r) => r.priority === "low"),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Reminders</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{open.length} open follow-up{open.length !== 1 ? "s" : ""}</p>
      </div>

      {open.length === 0 && (
        <Card padding="md">
          <p className="text-sm text-zinc-400 text-center py-6">No open reminders. All caught up!</p>
        </Card>
      )}

      {(["high", "medium", "low"] as const).map((priority) => {
        const items = grouped[priority];
        if (items.length === 0) return null;
        return (
          <div key={priority}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-2 w-2 rounded-full ${priorityColor[priority]}`} />
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                {priorityLabel[priority]} Priority
              </h2>
              <span className="text-xs text-zinc-400">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map((r) => (
                <Card key={r.id} padding="sm">
                  <div className="flex items-start gap-4">
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${priorityColor[r.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{r.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Link
                              href={`/leads/${r.leadId}`}
                              className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-2"
                            >
                              {r.leadName}
                            </Link>
                            <span className="text-zinc-200">·</span>
                            <div className="flex items-center gap-1.5">
                              <Avatar name={r.assignedTo} size="sm" />
                              <span className="text-xs text-zinc-400">{r.assignedTo}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <FollowUpBadge status={r.followUpStatus} />
                          <span className="text-xs text-zinc-400">Due {formatDate(r.dueDate)}</span>
                          <button
                            onClick={() => snoozeReminder(r.id, dateFromNow(1))}
                            className="text-xs text-zinc-400 hover:text-zinc-600 border border-zinc-200 rounded-md px-2.5 py-1 hover:border-zinc-300 transition-colors"
                          >
                            Snooze 1d
                          </button>
                          <button
                            onClick={() => completeReminder(r.id)}
                            className="text-xs text-zinc-400 hover:text-emerald-600 border border-zinc-200 rounded-md px-2.5 py-1 hover:border-emerald-300 transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {done.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Completed ({done.length})
          </h2>
          <div className="space-y-2">
            {done.map((r) => (
              <Card key={r.id} padding="sm">
                <div className="flex items-center gap-4 opacity-50">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-600 line-through">{r.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{r.leadName}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
