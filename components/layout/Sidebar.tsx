"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRole, AGENT_NAME, AGENT_INITIALS, MANAGER_NAME, MANAGER_INITIALS } from "@/lib/role-context";
import { useStore } from "@/lib/store";

const AGENT_NAV = [
  { href: "/", label: "Dashboard", icon: "⬜" },
  { href: "/leads", label: "My Leads", icon: "👤" },
  { href: "/reminders", label: "My Reminders", icon: "🔔" },
];

const MANAGER_NAV = [
  { href: "/", label: "Dashboard", icon: "⬜" },
  { href: "/business-overview", label: "Business Overview", icon: "📈" },
  { href: "/leads", label: "All Leads", icon: "👥" },
  { href: "/admin", label: "Admin Queue", icon: "🛡️" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/reminders", label: "Reminders", icon: "🔔" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role, setRole } = useRole();
  const { resetStore } = useStore();

  const navItems = role === "agent" ? AGENT_NAV : MANAGER_NAV;
  const userName = role === "agent" ? AGENT_NAME : MANAGER_NAME;
  const userInitials = role === "agent" ? AGENT_INITIALS : MANAGER_INITIALS;
  const userLabel = role === "agent" ? "Agent" : "Manager";
  const avatarColor = role === "agent" ? "bg-violet-500" : "bg-emerald-600";

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-zinc-950 min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-white flex items-center justify-center">
            <span className="text-xs font-bold text-zinc-900">B</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">BrokerFlow</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">CRM Prototype</p>
          </div>
        </div>
      </div>

      {/* Role switcher */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Demo as</p>
        <div className="flex rounded-lg bg-zinc-900 p-0.5">
          <button
            onClick={() => setRole("agent")}
            className={cn(
              "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
              role === "agent"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Agent
          </button>
          <button
            onClick={() => setRole("manager")}
            className={cn(
              "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
              role === "manager"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Manager
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Reset demo */}
      <div className="px-3 pb-2">
        <button
          onClick={() => resetStore()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <span className="text-base leading-none">↺</span>
          Reset Demo
        </button>
      </div>

      {/* User */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0",
              avatarColor
            )}
          >
            {userInitials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className="text-[10px] text-zinc-400 truncate">{userLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
