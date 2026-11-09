"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function ResetPage() {
  const { resetStore } = useStore();

  useEffect(() => {
    // Clear everything this demo saved, then restore fresh demo data and go home.
    // resetStore blocks the store's save effect, so the old in-memory state
    // can't be written back before the redirect.
    localStorage.clear();
    resetStore("/");
  }, [resetStore]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
      <p>Clearing all data...</p>
      <p style={{ fontSize: "0.8rem", color: "#888" }}>You will be redirected automatically.</p>
    </div>
  );
}
