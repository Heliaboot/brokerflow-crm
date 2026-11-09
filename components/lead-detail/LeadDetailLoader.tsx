"use client";

import { useStore } from "@/lib/store";
import { LeadDetailClient } from "./LeadDetailClient";

export function LeadDetailLoader({ leadId }: { leadId: string }) {
  const { leads, activities, reminders, showings } = useStore();

  const lead = leads.find((l) => l.id === leadId);
  if (!lead) {
    return (
      <div className="max-w-xl mx-auto mt-24 text-center">
        <p className="text-sm text-zinc-400">Lead not found.</p>
      </div>
    );
  }

  const leadActivities = activities
    .filter((a) => a.leadId === leadId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const leadReminders = reminders.filter((r) => r.leadId === leadId);

  // Exclude soft-deleted showings; newest visit date first
  const leadShowings = showings
    .filter((s) => s.leadId === leadId && !s.deletedAt)
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  return (
    <LeadDetailClient
      lead={lead}
      activities={leadActivities}
      reminders={leadReminders}
      showings={leadShowings}
    />
  );
}
