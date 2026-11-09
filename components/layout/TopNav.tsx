"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRole, AGENT_INITIALS, MANAGER_INITIALS } from "@/lib/role-context";
import { STORAGE_KEY } from "@/lib/storage-config";

const AGENT_NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "My Leads" },
  { href: "/reminders", label: "Reminders" },
];

const MANAGER_NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/business-overview", label: "Overview" },
  { href: "/leads", label: "All Leads" },
  { href: "/admin", label: "Admin" },
  { href: "/reports", label: "Reports" },
  { href: "/reminders", label: "Reminders" },
];

export function TopNav() {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  const navItems = role === "agent" ? AGENT_NAV : MANAGER_NAV;
  const userInitials = role === "agent" ? AGENT_INITIALS : MANAGER_INITIALS;
  const avatarColor = role === "agent" ? "bg-violet-500" : "bg-emerald-600";
  const roleLabel = role === "agent" ? "Agent" : "Manager";
  const roleLabelColor = role === "agent" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700";

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30 md:hidden">
      <div className="flex items-center gap-2 px-4 h-14">
        {/* Logo + role badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-6 w-6 rounded-md bg-zinc-900 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">B</span>
          </div>
          <span className="text-sm font-semibold text-zinc-900">BrokerFlow</span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", roleLabelColor)}>
            {roleLabel}
          </span>
        </div>

        {/* Mobile nav - scrollable */}
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto ml-2">
          {navItems.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Role switcher + reset + avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); location.reload(); }}
            className="text-[10px] text-zinc-500 border border-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-50 whitespace-nowrap"
          >
            ↺ Reset
          </button>
          <button
            onClick={() => setRole(role === "agent" ? "manager" : "agent")}
            className="text-[10px] text-zinc-500 border border-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-50 whitespace-nowrap"
          >
            Switch role
          </button>
          <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white", avatarColor)}>
            {userInitials}
          </div>
        </div>
      </div>
      <p className="px-4 pb-1.5 -mt-1 text-[10px] text-zinc-400">Portfolio demo - fictional data</p>
    </header>
  );
}
