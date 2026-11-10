"use client";

import { useRole } from "@/lib/role-context";
import { AgentDashboard } from "@/components/dashboard/AgentDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { role } = useRole();
  return (
    <>
      {/* Same width as the dashboard below it (agent 5xl, manager 7xl) */}
      <WelcomeBanner className={cn("mx-auto mb-5", role === "agent" ? "max-w-5xl" : "max-w-7xl")} />
      {role === "agent" ? <AgentDashboard /> : <ManagerDashboard />}
    </>
  );
}
