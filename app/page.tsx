"use client";

import { useRole } from "@/lib/role-context";
import { AgentDashboard } from "@/components/dashboard/AgentDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";

export default function DashboardPage() {
  const { role } = useRole();
  return role === "agent" ? <AgentDashboard /> : <ManagerDashboard />;
}
