import { mockLeads } from "@/lib/mock-data";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const agentLeads = mockLeads.filter((l) => l.assignedAgent === "Alex Morgan");
  return NextResponse.json({
    total: mockLeads.length,
    demoAgentCount: agentLeads.length,
    leads: agentLeads.map((l) => ({ id: l.id, name: `${l.firstName} ${l.lastName}`, stage: l.stage, leadType: l.leadType })),
  });
}
