"use client";

import { useState } from "react";

/**
 * Current time (ms), read once when the component mounts.
 * Keeps render pure (React's purity rule forbids calling Date.now() during
 * render) while still letting views show "waiting 3h" / "no contact in 8d".
 * The value refreshes whenever the component remounts, e.g. on navigation.
 */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}
