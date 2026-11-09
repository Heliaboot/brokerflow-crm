"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type Role = "agent" | "manager";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue>({
  role: "agent",
  setRole: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("agent");
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

export const AGENT_NAME = "Alex Morgan";
export const AGENT_INITIALS = "AM";
export const MANAGER_NAME = "Jamie Walsh";
export const MANAGER_INITIALS = "JW";
