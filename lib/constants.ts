import type { PipelineStage, QualificationStatus, FollowUpStatus, RelationshipStatus, LeadType, LeadCategory, ClientTimeline, PreferredContactMethod, LeadPriority, FinancingStatus, ApplicationReadiness } from "./types";

export const PIPELINE_STAGES: PipelineStage[] = [
  "New",
  "Contacted",
  "Appointment Scheduled",
  "Pre-Listing",
  "Showing / Active Search",
  "Offer",
  "Under Contract",
  "Closed",
  "Lost",
];

/** Ordered stages shown in the Seller pipeline (excludes Buyer-only stages). */
export const SELLER_PIPELINE_STAGES: PipelineStage[] = [
  "New",
  "Contacted",
  "Appointment Scheduled",
  "Pre-Listing",
  "Showing / Active Search",
  "Offer",
  "Under Contract",
  "Closed",
  "Lost",
];

export const SELLER_UNDER_CONTRACT_CHECKLIST_TASKS = [
  "Send Agreement of Purchase and Sale to seller",
  "Send Agreement of Purchase and Sale to lawyer",
  "Update documents in the back-office system",
  "Send Closing Information Package to seller",
] as const;

export const PRE_LISTING_CHECKLIST_TASKS = [
  "Confirm listing price with seller",
  "Schedule professional photography",
  "Arrange staging consultation",
  "Complete property disclosure documents",
  "Prepare MLS listing draft",
  "Review property tax statement",
  "Verify seller identity (ID confirmed — seller is registered owner)",
  "Inclusions & Exclusions documented",
] as const;

export const CONDITION_TYPE_LABELS: Record<string, string> = {
  financing:          "Financing",
  home_inspection:    "Home Inspection",
  status_certificate: "Status Certificate",
  sale_of_property:   "Sale of Property",
  lawyer_review:      "Lawyer Review",
  due_diligence:      "Due Diligence",
  other:              "Other",
};

export const LANDLORD_PRE_LISTING_CHECKLIST_TASKS = [
  "Confirm monthly rental price (research current local market rates)",
  "Schedule professional photography",
  "Set income requirements and prepare credit check consent form",
  "Prepare rental listing description and showing schedule",
] as const;

export const LANDLORD_LEASE_SIGNED_CHECKLIST_TASKS = [
  "Send signed lease to landlord (client)",
  "Send signed lease to lawyer",
  "Collect deposit from tenant",
  "Update documents in the back-office system",
  "Standard lease agreement follow up",
] as const;

export const TENANT_LEASE_SIGNED_CHECKLIST_TASKS = [
  "Review standard lease terms with tenant",
  "Confirm tenant has signed lease and received a copy",
  "Confirm deposit paid",
  "Update documents in the back-office system",
  "Remind client to obtain tenant liability insurance",
  "Remind client to set up utility accounts",
] as const;

export const CHECKLIST_ITEM_SUBTEXTS: Record<string, string> = {
  "Remind client to obtain tenant liability insurance":
    "Not required by local tenancy law unless specified in the lease — recommend minimum $1M–$2M liability coverage",
  "Remind client to set up utility accounts":
    "Required only if tenant is responsible under the lease — advise client to contact hydro, gas, and/or water provider before move-in date",
};

export const LANDLORD_LOSS_REASONS: { value: string; label: string }[] = [
  { value: "rented_privately",       label: "Property Rented Privately" },
  { value: "decided_not_to_rent",    label: "Decided Not to Rent" },
  { value: "listed_another_agent",   label: "Listed with Another Agent" },
  { value: "other",                  label: "Other" },
];

export const SELLER_LOSS_REASONS: { value: string; label: string }[] = [
  { value: "expired_re_listed",      label: "Listing Expired — re-listed with another agent" },
  { value: "withdrawn_not_selling",  label: "Listing Withdrawn — seller decided not to sell" },
  { value: "never_obtained",         label: "Never Obtained Listing — lost before signing agreement" },
  { value: "other",                  label: "Other" },
];

export const RECRUIT_JOINED_CHECKLIST_TASKS = [
  "Collect signed Independent Contractor Agreement (ICA)",
  "Initiate licence transfer with the regulator (60-day deadline from previous brokerage termination)",
  "Set up agent profile in the back-office system",
  "Schedule onboarding session with broker",
] as const;

export const RECRUIT_LOSS_REASONS: { value: string; label: string }[] = [
  { value: "declined_offer",           label: "Declined Offer" },
  { value: "stayed_current",           label: "Stayed at Current Brokerage" },
  { value: "joined_another",           label: "Joined Another Brokerage" },
  { value: "lost_contact",             label: "Lost Contact" },
  { value: "did_not_meet_standards",   label: "Did Not Meet Brokerage Standards" },
  { value: "other",                    label: "Other" },
];

export const YEARS_EXPERIENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "under_1",  label: "Less than 1 year" },
  { value: "1_to_3",   label: "1–3 years" },
  { value: "3_to_5",   label: "3–5 years" },
  { value: "5_to_10",  label: "5–10 years" },
  { value: "over_10",  label: "10+ years" },
];

export const ANNUAL_TRANSACTION_VOLUME_OPTIONS: { value: string; label: string }[] = [
  { value: "under_5",  label: "Under 5 deals/year" },
  { value: "5_to_12",  label: "5–12 deals/year" },
  { value: "13_to_24", label: "13–24 deals/year" },
  { value: "over_25",  label: "25+ deals/year" },
];

export const SPECIALIZATION_OPTIONS: { value: string; label: string }[] = [
  { value: "residential",     label: "Residential" },
  { value: "commercial",      label: "Commercial" },
  { value: "leasing",         label: "Leasing" },
  { value: "pre_construction", label: "Pre-Construction" },
  { value: "mixed",           label: "Mixed" },
];

/**
 * UI label for steps that exist for regulatory reasons (buyer representation
 * agreement before an offer, seller identity verification, agent licence
 * transfer). The rules behind them are jurisdiction-specific and are the main
 * candidates for per-market configuration when reusing this CRM.
 */
export const COMPLIANCE_STEP_LABEL = "Regulatory compliance step";

/** Conversion stage for Buyer / Tenant / Recruit / Investor pipelines. */
export const CONVERSION_STAGE: PipelineStage = "Showing / Active Search";

/** Conversion stage for Seller + Landlord pipelines (listing agreement signed). */
export const SELLER_CONVERSION_STAGE: PipelineStage = "Pre-Listing";

/** Returns the conversion stage for a given lead type. */
export function getConversionStage(leadType?: string): PipelineStage {
  if (leadType === "Seller" || leadType === "Landlord") return SELLER_CONVERSION_STAGE;
  return CONVERSION_STAGE;
}

export const QUALIFICATION_STATUSES: QualificationStatus[] = [
  "Pending Review",
  "Qualified",
  "Not Qualified",
];

export const FOLLOW_UP_STATUSES: FollowUpStatus[] = [
  "Active Follow-Up",
  "Long-Term Follow-Up",
  "Waiting for Client",
  "Paused",
  "Do Not Contact",
];

export const RELATIONSHIP_STATUSES: RelationshipStatus[] = [
  "Prospect",
  "Personal Connection",
  "Referral",
  "Repeat Client",
  "Past Client",
];

export const LEAD_TYPES: LeadType[] = [
  "Buyer",
  "Seller",
  "Investor",
  "Tenant",
  "Landlord",
  "Recruit",
  "Other",
];

export const LEAD_CATEGORIES: LeadCategory[] = [
  "Residential",
  "Commercial",
  "Development / Land",
  "Leasing",
  "Other",
];

export const CLIENT_TIMELINES: ClientTimeline[] = [
  "ASAP",
  "0–3 Months",
  "3–6 Months",
  "6–12 Months",
  "12+ Months",
  "Just Exploring",
  "Unknown",
];

export const PREFERRED_CONTACT_METHODS: PreferredContactMethod[] = [
  "Call",
  "Text",
  "Email",
  "WhatsApp",
];

export const LEAD_PRIORITIES: LeadPriority[] = ["High", "Medium", "Low"];

export const FINANCING_STATUSES: FinancingStatus[] = [
  "Not Started",
  "Pre-Qualified",
  "Pre-Approved",
  "Cash Buyer",
  "Unknown",
];

export const LEAD_SOURCES = [
  "Zillow",
  "Realtor.ca",
  "Website",
  "Referral",
  "Open House",
  "Instagram",
  "Facebook",
  "LinkedIn",
  "Google Ads",
  "Sign Call",
  "Walk-In",
  "Sphere",
  "Agent Referral",
  "Builder",
  "Manual Entry",
  "Other",
];

export const PROPERTY_TYPES = [
  "Detached",
  "Semi-Detached",
  "Condo",
  "Townhouse",
  "Multiplex",
  "Investment Property",
  "Commercial",
  "Land",
  "Other",
];

/**
 * stage_key → lead_type → display_name
 * Only entries that differ from the default stage_key label are listed.
 * All reports and conversion logic always use the stage_key (PipelineStage).
 */
export const STAGE_DISPLAY_NAME_OVERRIDES: Partial<Record<PipelineStage, Partial<Record<LeadType, string>>>> = {
  "Showing / Active Search": {
    Seller:   "Listed / Active",
    Landlord: "Listed / Active",
    Recruit:  "In Conversation",
  },
  "Lost": {
    Buyer:    "Inactive",
    Seller:   "Inactive",
    Landlord: "Inactive",
    Tenant:   "Inactive",
    Recruit:  "Inactive",
    Investor: "Inactive",
    Other:    "Inactive",
  },
  "Offer": {
    Seller:   "Offer Received",
    Landlord: "Application Received",
    Tenant:   "Application Submitted",
  },
  "Under Contract": {
    Landlord: "Lease Signed",
    Tenant:   "Lease Signed",
    Recruit:  "Offer Extended",
  },
  "Closed": {
    Recruit: "Joined",
  },
};

/**
 * Returns the agent-facing display name for a pipeline stage.
 * Falls back to the stage key if no override exists for the given lead type.
 */
export function getStageDisplayName(stage: PipelineStage, leadType?: LeadType): string {
  if (!leadType) return stage;
  return STAGE_DISPLAY_NAME_OVERRIDES[stage]?.[leadType] ?? stage;
}

export const STAGE_COLORS: Record<PipelineStage, string> = {
  New: "bg-slate-100 text-slate-700",
  Contacted: "bg-indigo-50 text-indigo-700",
  "Appointment Scheduled": "bg-violet-50 text-violet-700",
  "Pre-Listing": "bg-sky-50 text-sky-700",
  "Showing / Active Search": "bg-amber-50 text-amber-700",
  Offer: "bg-orange-50 text-orange-700",
  "Under Contract": "bg-emerald-50 text-emerald-700",
  Closed: "bg-green-100 text-green-800",
  Lost: "bg-red-50 text-red-600",
};

export const QUALIFICATION_COLORS: Record<QualificationStatus, string> = {
  "Pending Review": "bg-yellow-50 text-yellow-700",
  Qualified: "bg-emerald-50 text-emerald-700",
  "Not Qualified": "bg-red-50 text-red-600",
};

export const FOLLOW_UP_COLORS: Record<FollowUpStatus, string> = {
  "Active Follow-Up": "bg-blue-50 text-blue-700",
  "Long-Term Follow-Up": "bg-indigo-50 text-indigo-600",
  "Waiting for Client": "bg-amber-50 text-amber-700",
  Paused: "bg-slate-100 text-slate-500",
  "Do Not Contact": "bg-red-50 text-red-600",
};

export const APPLICATION_READINESS_STATUSES: ApplicationReadiness[] = [
  "Not Started",
  "In Progress",
  "Documents Ready",
  "Unknown",
];

export const APPLICATION_READINESS_COLORS: Record<ApplicationReadiness, string> = {
  "Not Started":     "bg-zinc-100 text-zinc-500",
  "In Progress":     "bg-amber-50 text-amber-700",
  "Documents Ready": "bg-emerald-50 text-emerald-700",
  "Unknown":         "bg-zinc-100 text-zinc-400",
};

export const FINANCING_STATUS_COLORS: Record<FinancingStatus, string> = {
  "Not Started":  "bg-zinc-100 text-zinc-500",
  "Pre-Qualified":"bg-blue-50 text-blue-700",
  "Pre-Approved": "bg-emerald-50 text-emerald-700",
  "Cash Buyer":   "bg-violet-50 text-violet-700",
  "Unknown":      "bg-zinc-100 text-zinc-400",
};

export const RELATIONSHIP_COLORS: Record<RelationshipStatus, string> = {
  Prospect: "bg-slate-100 text-slate-600",
  "Personal Connection": "bg-purple-50 text-purple-700",
  Referral: "bg-teal-50 text-teal-700",
  "Repeat Client": "bg-emerald-50 text-emerald-700",
  "Past Client": "bg-blue-50 text-blue-600",
};
