"use client";
import { useEffect } from "react";

export default function ResetPage() {
  useEffect(() => {
    localStorage.clear();
    window.location.replace("/");
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
      <p>Clearing all data...</p>
      <p style={{ fontSize: "0.8rem", color: "#888" }}>You will be redirected automatically.</p>
    </div>
  );
}
