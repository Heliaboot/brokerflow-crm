/**
 * Live metrics for the manager Reports page and Manager dashboard.
 *
 * Built from the same store data and rules as the Business Overview
 * (lib/business-metrics.ts): a "closed" deal is a closed-won lead, so
 * "Not Now" exits (stage Closed + closeReason "closed_elsewhere") are counted
 * separately as nurture and never as closed deals.
 */
import type { Lead, Activity } from "./types";
import {
  isClosedWon,
  getConversionRate,
  getAvgDaysToClose,
  getAvgFirstContactHours,
} from "./business-metrics";

export interface AgentReportRow {
  agent: string;
  leads: number;
  closedWon: number;
  /** closedWon ÷ leads, whole-number percent; null when the agent has no leads. */
  closeRate: number | null;
  assigned: number;
  contacted: number;
  /** Mean hours to first logged contact attempt; null when none are logged. */
  avgHoursToContact: number | null;
}

export interface ReportMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  closedWon: number;
  inactive: number;
  /** "Not Now" leads — moved to long-term nurture, not won and not lost. */
  nurture: number;
  conversionRate: number | null;
  avgDaysToClose: number | null;
  avgDaysSampleSize: number;
  closedWonThisMonth: number;
  activeFollowUps: number;
  awaitingFirstContact: number;
  avgHoursToFirstContact: number | null;
  firstContactSampleSize: number;
  byAgent: AgentReportRow[];
}

const isNotNow = (l: Lead) => l.stage === "Closed" && l.closeReason === "closed_elsewhere";
const isOpen = (l: Lead) => l.stage !== "Closed" && l.stage !== "Lost";
/** Same rule as the dashboard alerts: still New and never contacted. */
const isAwaitingFirstContact = (l: Lead) => l.stage === "New" && !l.lastContactedAt;

function firstContactHours(lead: Lead, activities: Activity[]): number | null {
  const first = activities
    .filter((a) => a.leadId === lead.id && a.type === "contact_attempt")
    .map((a) => new Date(a.createdAt).getTime())
    .sort((a, b) => a - b)[0];
  if (first === undefined) return null;
  const h = (first - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
  return h >= 0 ? h : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * @param now  current time in ms — pass it in (e.g. from useNow()) so the
 *             calculation stays pure during render.
 */
export function getReportMetrics(leads: Lead[], activities: Activity[], now: number): ReportMetrics {
  const conversion = getConversionRate({ leads });
  const avgDays = getAvgDaysToClose({ leads });
  const firstContact = getAvgFirstContactHours({ leads, activities });

  const d = new Date(now);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const closedWonThisMonth = leads.filter(
    (l) => isClosedWon(l) && new Date(l.updatedAt).getTime() >= monthStart
  ).length;

  const agents = [...new Set(leads.map((l) => l.assignedAgent).filter(Boolean))].sort();
  const byAgent: AgentReportRow[] = agents.map((agent) => {
    const mine = leads.filter((l) => l.assignedAgent === agent);
    const closedWon = mine.filter(isClosedWon).length;
    const contactHours = mine
      .map((l) => firstContactHours(l, activities))
      .filter((h): h is number => h !== null);
    return {
      agent,
      leads: mine.length,
      closedWon,
      closeRate: mine.length > 0 ? Math.round((closedWon / mine.length) * 100) : null,
      assigned: mine.length,
      contacted: mine.filter((l) => !isAwaitingFirstContact(l)).length,
      avgHoursToContact:
        contactHours.length > 0 ? round1(contactHours.reduce((s, h) => s + h, 0) / contactHours.length) : null,
    };
  });

  return {
    totalLeads: leads.length,
    qualifiedLeads: leads.filter((l) => l.qualificationStatus === "Qualified").length,
    closedWon: conversion.closed,
    inactive: conversion.lost,
    nurture: leads.filter(isNotNow).length,
    conversionRate: conversion.rate,
    avgDaysToClose: avgDays.avgDays,
    avgDaysSampleSize: avgDays.sampleSize,
    closedWonThisMonth,
    activeFollowUps: leads.filter((l) => isOpen(l) && l.followUpStatus === "Active Follow-Up").length,
    awaitingFirstContact: leads.filter(isAwaitingFirstContact).length,
    avgHoursToFirstContact: firstContact.avgHours,
    firstContactSampleSize: firstContact.sampleSize,
    byAgent,
  };
}
