import type { OutcomeCategory, ContactAttemptEvent, PipelineStage } from "./types";

const OUTCOME_MAP: Record<string, OutcomeCategory> = {
  "Connected — Two-Way Conversation": "connected",
  "Reply Received":                   "connected",
  "Made Contact":                     "connected",
  "Left Voicemail":                   "voicemail",
  "Voicemail Left":                   "voicemail",
  "No Answer — No Voicemail":         "no_answer",
  "Line Busy / Disconnected":         "no_answer",
  "Sent — Awaiting Reply":            "sent_awaiting",
  "No Response":                      "no_response",
};

export function categorizeOutcome(result: string): OutcomeCategory {
  return OUTCOME_MAP[result] ?? "no_answer";
}

export function buildContactAttemptEvent(params: {
  method: string;
  result: string;
  agent: string;
  timestamp: string;
  stageChanged: boolean;
  previousStage?: PipelineStage;
  followUpCreated: boolean;
  followUpTitle?: string;
  note?: string;
}): ContactAttemptEvent {
  const category = categorizeOutcome(params.result);
  return {
    method: params.method,
    result: params.result,
    outcomeCategory: category,
    isTwoWay: category === "connected",
    stageChanged: params.stageChanged,
    previousStage: params.previousStage,
    followUpCreated: params.followUpCreated,
    followUpTitle: params.followUpTitle,
    agent: params.agent,
    timestamp: params.timestamp,
    note: params.note || undefined,
  };
}
