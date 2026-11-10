"use client";

import { useEffect } from "react";
import { useRole } from "@/lib/role-context";
import { AgentDashboard } from "@/components/dashboard/AgentDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { role } = useRole();

  // The app draws only after browser data loads (lib/store.tsx), so on a full
  // page load of e.g. "/#pipeline" the browser's own jump happens before the
  // section exists. Repeat it once the dashboard has rendered.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <>
      {/* Same width as the dashboard below it (agent 5xl, manager 7xl) */}
      <WelcomeBanner className={cn("mx-auto mb-5", role === "agent" ? "max-w-5xl" : "max-w-7xl")} />
      {role === "agent" ? <AgentDashboard /> : <ManagerDashboard />}
    </>
  );
}
