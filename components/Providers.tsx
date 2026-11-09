"use client";

import { RoleProvider } from "@/lib/role-context";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <RoleProvider>{children}</RoleProvider>
    </StoreProvider>
  );
}
