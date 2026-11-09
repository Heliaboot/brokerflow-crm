export type PipelineStage =
  | "New"
  | "Contacted"
  | "Appointment Scheduled"
  | "Pre-Listing"
  | "Showing / Active Search"
  | "Offer"
  | "Under Contract"
  | "Closed"
  | "Lost";

export type QualificationStatus = "Pending Review" | "Qualified" | "Not Qualified";

export type FollowUpStatus =
  | "Active Follow-Up"
  | "Long-Term Follow-Up"
  | "Waiting for Client"
  | "Paused"
  | "Do Not Contact";

export type RelationshipStatus =
  | "Prospect"
  | "Personal Connection"
  | "Referral"
  | "Repeat Client"
  | "Past Client";

export type LeadType =
  | "Buyer"
  | "Seller"
  | "Investor"
  | "Tenant"
  | "Landlord"
  | "Recruit"
  | "Other";

export type LeadCategory =
  | "Residential"
  | "Commercial"
  | "Development / Land"
  | "Leasing"
  | "Other";

export type ClientTimeline =
  | "ASAP"
  | "0–3 Months"
  | "3–6 Months"
  | "6–12 Months"
  | "12+ Months"
  | "Just Exploring"
  | "Unknown";

export type PreferredContactMethod = "Call" | "Text" | "Email" | "WhatsApp";

export type LeadPriority = "High" | "Medium" | "Low";

export type FinancingStatus =
  | "Not Started"
  | "Pre-Qualified"
  | "Pre-Approved"
  | "Cash Buyer"
  | "Unknown";

export type ApplicationReadiness =
  | "Not Started"
  | "In Progress"
  | "Documents Ready"
  | "Unknown";

export type ActivityType =
  | "call"
  | "email"
  | "note"
  | "showing"
  | "offer"
  | "stage_change"
  | "reminder"
  | "meeting"
  | "sms"
  | "whatsapp"
  | "voicemail"
  | "contact_attempt"
  | "follow_up_created"
  | "assignment"
  | "showing_edited"
  | "showing_deleted"
  | "task_completed"
  | "checklist";

/**
 * Normalized outcome bucket for response-rate analytics.
 * Maps many raw result strings → a small set of queryable categories.
 */
export type OutcomeCategory =
  | "connected"      // two-way conversation, reply received, made contact
  | "voicemail"      // voicemail left
  | "no_answer"      // no answer, busy, disconnected
  | "sent_awaiting"  // message sent, awaiting reply
  | "no_response";   // no response to prior outreach

/**
 * Structured analytics payload attached to every contact_attempt Activity.
 * Designed to power: response rate reporting, AI coaching, lead engagement
 * scoring, broker performance dashboards, and follow-up effectiveness metrics.
 */
export interface ContactAttemptEvent {
  method: string;            // outreach method (e.g. "Phone Call", "SMS")
  result: string;            // raw result label from the modal
  outcomeCategory: OutcomeCategory;  // normalized for analytics queries
  isTwoWay: boolean;         // true → live conversation or reply received
  stageChanged: boolean;     // true → lead moved to Contacted after this attempt
  previousStage?: string;    // stage before the change, for funnel analytics
  followUpCreated: boolean;  // true → a reminder was scheduled after this attempt
  followUpTitle?: string;    // reminder title, for follow-up effectiveness reporting
  agent: string;             // explicit for broker performance; mirrors createdBy
  timestamp: string;         // ISO 8601; mirrors createdAt, explicit for event log
  note?: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  result?: string;
  /** Structured analytics payload — present only on contact_attempt activities. */
  contactAttempt?: ContactAttemptEvent;
}

/**
 * Payload stored on a Reminder when it represents a scheduled property showing.
 * Pre-fills the Showing Log completion form so agents only need to add notes.
 */
export interface ShowingTask {
  mlsNumber?: string;
  address: string;
  scheduledDate: string;   // ISO datetime, e.g. "2026-05-24T10:00:00"
  preVisitNotes?: string;
}

export interface Reminder {
  id: string;
  leadId: string;
  leadName: string;
  title: string;
  dueDate: string;
  createdAt: string;   // ISO 8601 — used to gate the "recent activity" auto-close logic
  followUpStatus: FollowUpStatus;
  assignedTo: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  /** Present only when this reminder is a scheduled showing. */
  showingTask?: ShowingTask;
  /** Links to an offer date (irrevocable, deposit, closing, condition) for cleanup on update. */
  sourceId?: string;
}

/**
 * Listing details for Seller leads — created when agent signs the listing agreement.
 * One record per lead (unique on lead_id).
 */
export interface ListingDetails {
  id: string;
  leadId: string;
  listingAgreementSignedDate?: string;  // YYYY-MM-DD
  listingAgreementExpiryDate?: string;  // YYYY-MM-DD — drives auto-expiry detection
  expectedListingPrice?: number;
  mlsNumber?: string;
  targetListDate?: string;              // YYYY-MM-DD
  actualListDate?: string;              // YYYY-MM-DD — set when listed on MLS
  // Lifecycle fields (Session 10c)
  listingStatus?: "draft" | "active" | "suspended" | "expired" | "extended" | "terminated";
  commission?: string;                  // e.g. "4%" or "2.5% + 2.5%"
  extensionCount?: number;              // increments each time the agreement is extended
  terminationDate?: string;             // YYYY-MM-DD
  terminationReason?: string;
  inclusionsNotes?: string;             // captured during pre-listing checklist
  exclusionsNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  stage: PipelineStage;
  leadType?: LeadType;
  leadCategory?: LeadCategory;
  clientTimeline?: ClientTimeline;
  timelineNotes?: string;
  preferredContactMethod?: PreferredContactMethod;
  sourceNotes?: string;
  motivationNotes?: string;
  /** Seller pipeline only — captured during discovery. Values: "30", "60", "90", or free text. */
  closingDateExpectation?: string;
  /** ISO timestamp set when a Seller/Landlord first enters Pre-Listing (listing agreement signed). */
  preListingAt?: string;
  priority?: LeadPriority;
  internalTags?: string[];
  budgetMax?: string;
  financingStatus?: FinancingStatus;
  mortgagePreApproved?: boolean;
  investmentGoals?: string;
  propertyFeatures?: string;
  bedroomBathroomPrefs?: string;
  schoolTransitNotes?: string;
  qualificationStatus: QualificationStatus;
  followUpStatus: FollowUpStatus;
  relationshipStatus: RelationshipStatus;
  assignedAgent: string;
  source: string;
  budget?: string;
  propertyType?: string;
  preferredAreas?: string[];
  notes?: string;
  /** Seller pipeline only — set when lead is moved to Lost. */
  lossReason?: string;
  /** Tenant pipeline only — set when lead starts active search. */
  applicationReadiness?: ApplicationReadiness;
  /** Buyer pipeline — derived list of active thread IDs (threads are source of truth). */
  activeOfferThreadIds?: string[];
  /** Buyer pipeline — set when returning to Active Search after a lost offer, triggers auto-open of Offer Submitted modal. */
  offerLostReturn?: boolean;
  /** Set when lead exits the pipeline via a non-standard close. */
  closeReason?: "closed_elsewhere" | "do_not_contact";
  /** Buyer/Tenant: reason agent selected when pausing the search */
  pauseReason?: string;
  /** Buyer/Tenant: expected return date from pause (YYYY-MM-DD) */
  pauseReturnDate?: string;
  /** Seller/Landlord: listing suspension end date (YYYY-MM-DD) */
  listingSuspensionEndDate?: string;
  /** Seller/Landlord: listing suspension reason text */
  listingSuspensionReason?: string;
  /** Recruit pipeline fields */
  currentBrokerage?: string;
  yearsExperience?: "under_1" | "1_to_3" | "3_to_5" | "5_to_10" | "over_10";
  specialization?: string;
  expectedCommissionSplit?: string;
  annualTransactionVolume?: "under_5" | "5_to_12" | "13_to_24" | "over_25";
  areasOfFocus?: string;
  joinDate?: string;
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
  tags?: string[];
}

/**
 * A property showing logged during the "Showing / Active Search" stage.
 * Persists as read-only history once the lead advances past that stage.
 */
export interface Showing {
  id: string;
  leadId: string;
  mlsNumber?: string;   // optional — not all showings have an MLS listing
  address: string;
  visitDate: string;    // YYYY-MM-DD
  notes?: string;
  createdBy: string;
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
  deletedAt?: string;   // soft delete
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  leadsCount: number;
  closedCount: number;
}

// ── Tenant application sub-system (thread model) ─────────────────────────────

export type TenantApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";

/** One property application thread for a Tenant lead. A lead can have many (one per property). */
export interface TenantApplication {
  id: string;
  leadId: string;
  propertyAddress: string;
  monthlyRent?: number;
  landlordName?: string;
  status: TenantApplicationStatus;
  rejectionReason?: string;
  reasonForWithdrawal?: string;
  submittedAt: string;   // YYYY-MM-DD
  notes?: string;
  coopAgentFirstName?: string;
  coopAgentLastName?: string;
  coopAgentMobile?: string;
  coopAgentBrokerage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Created when a tenant application is approved; lead enters Lease Signed. Dates filled at that stage. */
export interface TenantLeaseDetails {
  id: string;
  leadId: string;
  applicationId: string;
  propertyAddress: string;   // pre-filled from application
  monthlyRent: number;       // pre-filled from application
  leaseStartDate?: string;   // YYYY-MM-DD — filled by agent at Lease Signed stage
  leaseEndDate?: string;     // YYYY-MM-DD — filled by agent; drives lease renewal reminder
  depositPaid: boolean;
  inspectionConfirmedAt?: string;  // ISO timestamp — set when agent confirms final inspection at Mark Closed
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Landlord rental sub-system ────────────────────────────────────────────────

export type RentalApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type CreditCheckStatus = "not_started" | "pending" | "passed" | "failed";

/** One tenant application for a Landlord lead. Multiple can be active simultaneously. */
export interface RentalApplication {
  id: string;
  leadId: string;
  applicantLabel?: string;       // e.g. "John & Maria Smith"
  status: RentalApplicationStatus;
  offerPrice?: number;
  creditCheckStatus: CreditCheckStatus;
  referencesChecked: boolean;
  notes?: string;
  coopAgentFirstName?: string;
  coopAgentLastName?: string;
  coopAgentMobile?: string;
  coopAgentBrokerage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Created when a rental application is approved and lead enters Lease Signed stage. */
export interface LeaseDetails {
  id: string;
  leadId: string;
  rentalApplicationId: string;
  monthlyRent: number;
  leaseStartDate: string;   // YYYY-MM-DD (move-in date)
  leaseEndDate: string;     // YYYY-MM-DD
  depositCollected: boolean;
  inspectionConfirmedAt?: string;  // ISO timestamp — set when agent confirms final inspection at Mark Closed
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Seller multi-offer sub-system ─────────────────────────────────────────────

export type SellerOfferStatus =
  | "active"      // under consideration
  | "countered"   // seller sent counter, awaiting buyer response
  | "accepted"    // seller accepted this offer
  | "rejected"    // seller rejected
  | "withdrawn";  // buyer withdrew before decision

/**
 * One competing offer from a specific buyer.
 * A Seller lead can have many SellerOfferThreads simultaneously.
 */
export interface SellerOfferThread {
  id: string;
  leadId: string;
  buyerLabel?: string;   // e.g. "John Smith" or "Buyer A" — optional
  status: SellerOfferStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * One round within a SellerOfferThread (initial offer or any counter).
 */
export interface SellerOfferRound {
  id: string;
  threadId: string;
  leadId: string;
  roundNumber: number;          // within this thread
  direction: OfferDirection;    // reuse existing type
  offerPrice: number;
  irrevocableAt: string;        // local datetime
  depositAmount?: number;
  status: OfferRoundStatus;     // reuse: active | accepted | countered | rejected | expired
  coopAgentFirstName?: string;
  coopAgentLastName?: string;
  coopAgentMobile?: string;
  coopAgentBrokerage?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Buyer offer thread sub-system ─────────────────────────────────────────────

export type BuyerOfferThreadStatus = "active" | "accepted" | "inactive";

/**
 * One property offer thread for a Buyer lead.
 * A Buyer lead can have many BuyerOfferThreads (one per property attempted).
 */
export interface BuyerOfferThread {
  id: string;
  leadId: string;
  propertyAddress: string;
  mlsNumber?: string;
  status: BuyerOfferThreadStatus;
  lossReason?: string;  // set when status = "inactive"
  coopAgentFirstName?: string;
  coopAgentLastName?: string;
  coopAgentMobile?: string;
  coopAgentBrokerage?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Buyer offer sub-system ─────────────────────────────────────────────────────

export type OfferDirection =
  | "buyer_submitted"
  | "seller_counter"
  | "buyer_counter";

export type OfferRoundStatus =
  | "active"
  | "accepted"
  | "countered"
  | "rejected"
  | "expired";

export type ConditionType =
  | "financing"
  | "home_inspection"
  | "status_certificate"
  | "sale_of_property"
  | "lawyer_review"
  | "due_diligence"
  | "other";

export type ConditionResolution = "pending" | "waived";

export type DealStatus = "conditional" | "firm" | "fell_through";

export interface OfferRound {
  id: string;
  leadId: string;
  /** Groups all rounds within the same offer attempt. Resets when a new offer is submitted after a loss. */
  attemptId?: string;
  /** Links this round to a BuyerOfferThread. */
  threadId?: string;
  /** Property address for this offer attempt — same for all rounds in the attempt. */
  propertyAddress?: string;
  roundNumber: number;
  direction: OfferDirection;
  offerPrice: number;
  irrevocableAt: string;  // local datetime, e.g. "2026-05-20T21:00:00"
  depositAmount?: number;
  status: OfferRoundStatus;
  /** Set on all rounds of a lost attempt — reason the offer was not accepted. */
  lossReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferCondition {
  id: string;
  acceptedOfferId: string;
  conditionType: ConditionType;
  conditionLabel?: string;    // only for conditionType = "other"
  conditionDeadline: string;  // YYYY-MM-DD
  resolution: ConditionResolution;
  resolvedAt?: string;        // ISO timestamp — auto-set on resolution
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * An auto-created checklist task tied to a pipeline stage transition.
 * Under Contract creates 4 of these automatically.
 */
export interface ChecklistItem {
  id: string;
  leadId: string;
  name: string;           // pre-defined label, not editable by agent
  status: "open" | "done";
  completedBy?: string;
  completedAt?: string;   // ISO timestamp
  optionalNote?: string;
  reminderDueDate?: string; // ISO string — set when agent picks "Remind Me Later"
  autoCreated: boolean;
  /** Distinguishes pre-listing tasks from under-contract tasks. Undefined = under_contract (backward compat). */
  checklistType?: "under_contract" | "pre_listing" | "follow_up";
  /** For buyer under-contract checklists: the offer thread that triggered creation. Used to detect property changes. */
  sourceThreadId?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Recruit offer sub-system ────────────────────────────────────────────────────

export type RecruitOfferStatus = "pending" | "accepted" | "declined";

export interface RecruitOffer {
  id: string;
  leadId: string;
  offerDate: string;           // YYYY-MM-DD
  commissionSplit: string;     // e.g. "80/20"
  proposedStartDate: string;   // YYYY-MM-DD
  offerExpiryDate?: string;    // YYYY-MM-DD
  status: RecruitOfferStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Seller showing / open house sub-system ─────────────────────────────────────

export type SellerShowingFeedback = "positive" | "neutral" | "negative" | "none";

export interface SellerShowing {
  id: string;
  leadId: string;
  showingDate: string;       // YYYY-MM-DD
  showingTime?: string;      // HH:MM
  buyerAgentName?: string;
  feedback: SellerShowingFeedback;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface OpenHouse {
  id: string;
  leadId: string;
  date: string;              // YYYY-MM-DD
  startTime?: string;        // HH:MM
  endTime?: string;          // HH:MM
  visitorCount?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface AcceptedOffer {
  id: string;
  leadId: string;
  offerRoundId: string;
  /** Links back to the BuyerOfferThread that was accepted. */
  threadId?: string;
  acceptedPrice: number;
  depositDueAt: string;  // YYYY-MM-DD
  closingDate: string;   // YYYY-MM-DD
  /** Optional: if deposit is paid in multiple installments, this overrides depositDueAt. */
  depositInstallments?: Array<{ installmentNumber: number; amount: number; dueDate: string }>;
  /** Optional title search date — drives a 2-day-before reminder. */
  titleSearchDate?: string;  // YYYY-MM-DD
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Buyer Representation Agreement ────────────────────────────────────────────

export interface BuyerAgreement {
  id: string;
  leadId: string;
  braSigned: boolean;
  braDate?: string;        // YYYY-MM-DD — required when braSigned is true
  braExpiryDate?: string;  // YYYY-MM-DD — expiry date of the BRA
  braNotes?: string;
  createdAt: string;
  updatedAt: string;
}
