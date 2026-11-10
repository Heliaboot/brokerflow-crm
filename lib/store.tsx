"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  mockLeads, mockActivities, mockReminders, mockShowings,
  mockOfferRounds, mockAcceptedOffers, mockOfferConditions, mockChecklistItems,
  mockListingDetails, mockSellerOfferThreads, mockSellerOfferRounds,
  mockRentalApplications, mockLeaseDetails,
  mockTenantApplications, mockTenantLeaseDetails,
  mockBuyerOfferThreads,
} from "./mock-data";
import type { Lead, Activity, Reminder, Showing, OfferRound, AcceptedOffer, OfferCondition, ChecklistItem, ListingDetails, SellerOfferThread, SellerOfferRound, RentalApplication, LeaseDetails, TenantApplication, TenantLeaseDetails, SellerShowing, OpenHouse, RecruitOffer, BuyerAgreement, BuyerOfferThread } from "./types";

// STORAGE_KEY / STORE_VERSION live in storage-config.ts, shared with the
// pre-hydration purge script in app/layout.tsx. Bump the version there whenever
// mock-data.ts or the state shape changes; a mismatch loads fresh defaults.
import { STORAGE_KEY, STORE_VERSION, LEGACY_STORAGE_KEYS, WELCOME_BANNER_DISMISSED_KEY } from "./storage-config";

interface StoreState {
  leads: Lead[];
  activities: Activity[];
  reminders: Reminder[];
  showings: Showing[];
  offerRounds: OfferRound[];
  acceptedOffers: AcceptedOffer[];
  offerConditions: OfferCondition[];
  checklistItems: ChecklistItem[];
  listingDetails: ListingDetails[];
  sellerOfferThreads: SellerOfferThread[];
  sellerOfferRounds: SellerOfferRound[];
  rentalApplications: RentalApplication[];
  leaseDetails: LeaseDetails[];
  tenantApplications: TenantApplication[];
  tenantLeaseDetails: TenantLeaseDetails[];
  sellerShowings: SellerShowing[];
  openHouses: OpenHouse[];
  recruitOffers: RecruitOffer[];
  buyerAgreements: BuyerAgreement[];
  buyerOfferThreads: BuyerOfferThread[];
}

interface StoreValue extends StoreState {
  // Leads
  addLead: (lead: Lead) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  // Activities
  addActivity: (activity: Activity) => void;
  // Reminders
  addReminder: (reminder: Reminder) => void;
  completeReminder: (id: string) => void;
  snoozeReminder: (id: string, newDate: string) => void;
  cancelRemindersBySourceId: (sourceId: string) => void;
  cancelRemindersBySourceIdPrefix: (prefix: string) => void;
  // Showings
  addShowing: (showing: Showing) => void;
  updateShowing: (id: string, patch: Partial<Showing>) => void;
  deleteShowing: (id: string) => void;
  // Offer rounds
  addOfferRound: (round: OfferRound) => void;
  updateOfferRound: (id: string, patch: Partial<OfferRound>) => void;
  // Accepted offers
  addAcceptedOffer: (offer: AcceptedOffer) => void;
  updateAcceptedOffer: (id: string, patch: Partial<AcceptedOffer>) => void;
  removeAcceptedOffer: (id: string) => void;
  // Offer conditions
  addOfferCondition: (condition: OfferCondition) => void;
  updateOfferCondition: (id: string, patch: Partial<OfferCondition>) => void;
  // Checklist items
  addChecklistItems: (items: ChecklistItem[]) => void;
  updateChecklistItem: (id: string, patch: Partial<ChecklistItem>) => void;
  // Listing details (Seller pipeline)
  addListingDetails: (ld: ListingDetails) => void;
  updateListingDetails: (id: string, patch: Partial<ListingDetails>) => void;
  // Seller multi-offer sub-system
  addSellerOfferThread: (thread: SellerOfferThread) => void;
  updateSellerOfferThread: (id: string, patch: Partial<SellerOfferThread>) => void;
  addSellerOfferRound: (round: SellerOfferRound) => void;
  updateSellerOfferRound: (id: string, patch: Partial<SellerOfferRound>) => void;
  // Landlord rental sub-system
  addRentalApplication: (app: RentalApplication) => void;
  updateRentalApplication: (id: string, patch: Partial<RentalApplication>) => void;
  addLeaseDetails: (lease: LeaseDetails) => void;
  updateLeaseDetails: (id: string, patch: Partial<LeaseDetails>) => void;
  // Tenant application sub-system
  addTenantApplication: (app: TenantApplication) => void;
  updateTenantApplication: (id: string, patch: Partial<TenantApplication>) => void;
  addTenantLeaseDetails: (lease: TenantLeaseDetails) => void;
  updateTenantLeaseDetails: (id: string, patch: Partial<TenantLeaseDetails>) => void;
  // Seller showings + open houses
  addSellerShowing: (s: SellerShowing) => void;
  addOpenHouse: (o: OpenHouse) => void;
  // Recruit offers
  addRecruitOffer: (offer: RecruitOffer) => void;
  updateRecruitOffer: (id: string, patch: Partial<RecruitOffer>) => void;
  // Buyer agreements
  addBuyerAgreement: (agreement: BuyerAgreement) => void;
  updateBuyerAgreement: (id: string, patch: Partial<BuyerAgreement>) => void;
  // Buyer offer threads
  addBuyerOfferThread: (thread: BuyerOfferThread) => void;
  updateBuyerOfferThread: (id: string, patch: Partial<BuyerOfferThread>) => void;
  // Reset
  /** Restores the demo data, then reloads the page (or navigates to `redirectTo`). */
  resetStore: (redirectTo?: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const defaultState: StoreState = {
  leads: mockLeads,
  activities: mockActivities,
  reminders: mockReminders,
  showings: mockShowings,
  offerRounds: mockOfferRounds,
  acceptedOffers: mockAcceptedOffers,
  offerConditions: mockOfferConditions,
  checklistItems: mockChecklistItems,
  listingDetails: mockListingDetails,
  sellerOfferThreads:  mockSellerOfferThreads,
  sellerOfferRounds:   mockSellerOfferRounds,
  rentalApplications:  mockRentalApplications,
  leaseDetails:        mockLeaseDetails,
  tenantApplications:  mockTenantApplications,
  tenantLeaseDetails:  mockTenantLeaseDetails,
  sellerShowings:      [],
  openHouses:          [],
  recruitOffers:       [],
  buyerAgreements:     [],
  buyerOfferThreads:   mockBuyerOfferThreads,
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  // Set by resetStore(); stops the save effect from writing old state back.
  const resettingRef = useRef(false);

  // Load saved demo data once, after mount. This is a deliberate exception to
  // react-hooks/set-state-in-effect: localStorage only exists in the browser, so
  // reading it during render would make the server-rendered HTML and the first
  // client render differ (hydration mismatch). The effect runs once ([] deps),
  // so it cannot cascade. A production build replaces this with server data.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      // Remove any legacy keys from previous storage scheme
      LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        // Version mismatch → discard stale cache, use fresh mock defaults
        if (p.__version !== STORE_VERSION) {
          localStorage.removeItem(STORAGE_KEY);
          setHydrated(true);
          return;
        }
        // Graceful migration: any field absent in stored data falls back to
        // the seeded default (handles new fields added after first load).
        setState({
          leads:          p.leads          ?? defaultState.leads,
          activities:     p.activities     ?? defaultState.activities,
          reminders:      p.reminders      ?? defaultState.reminders,
          showings:       p.showings       ?? defaultState.showings,
          offerRounds:    p.offerRounds    ?? defaultState.offerRounds,
          acceptedOffers: p.acceptedOffers ?? defaultState.acceptedOffers,
          offerConditions:p.offerConditions?? defaultState.offerConditions,
          checklistItems:      p.checklistItems      ?? defaultState.checklistItems,
          listingDetails:      p.listingDetails      ?? defaultState.listingDetails,
          sellerOfferThreads:  p.sellerOfferThreads  ?? defaultState.sellerOfferThreads,
          sellerOfferRounds:   p.sellerOfferRounds   ?? defaultState.sellerOfferRounds,
          rentalApplications:  p.rentalApplications  ?? defaultState.rentalApplications,
          leaseDetails:        p.leaseDetails        ?? defaultState.leaseDetails,
          tenantApplications:  p.tenantApplications  ?? defaultState.tenantApplications,
          tenantLeaseDetails:  p.tenantLeaseDetails  ?? defaultState.tenantLeaseDetails,
          sellerShowings:      p.sellerShowings      ?? defaultState.sellerShowings,
          openHouses:          p.openHouses          ?? defaultState.openHouses,
          recruitOffers:       p.recruitOffers       ?? defaultState.recruitOffers,
          buyerAgreements:     p.buyerAgreements     ?? defaultState.buyerAgreements,
          buyerOfferThreads:   p.buyerOfferThreads   ?? defaultState.buyerOfferThreads,
        });
      }
    } catch {}
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    // Once a reset has started, never write the old in-memory state back.
    if (!hydrated || resettingRef.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ __version: STORE_VERSION, ...state })); } catch {}
  }, [state, hydrated]);

  // ── Leads ─────────────────────────────────────────────────────────────────

  const addLead = (lead: Lead) =>
    setState((s) => ({ ...s, leads: [lead, ...s.leads] }));

  const updateLead = (id: string, patch: Partial<Lead>) =>
    setState((s) => ({
      ...s, leads: s.leads.map((l) => l.id === id ? { ...l, ...patch } : l),
    }));

  // ── Activities ────────────────────────────────────────────────────────────

  const addActivity = (activity: Activity) =>
    setState((s) => ({ ...s, activities: [activity, ...s.activities] }));

  // ── Reminders ─────────────────────────────────────────────────────────────

  const addReminder = (reminder: Reminder) =>
    setState((s) => ({ ...s, reminders: [reminder, ...s.reminders] }));

  const completeReminder = (id: string) =>
    setState((s) => ({
      ...s, reminders: s.reminders.map((r) => r.id === id ? { ...r, completed: true } : r),
    }));

  const snoozeReminder = (id: string, newDate: string) =>
    setState((s) => ({
      ...s, reminders: s.reminders.map((r) => r.id === id ? { ...r, dueDate: newDate } : r),
    }));

  const cancelRemindersBySourceId = (sourceId: string) =>
    setState((s) => ({
      ...s,
      reminders: s.reminders.map((r) =>
        r.sourceId === sourceId ? { ...r, completed: true } : r
      ),
    }));

  const cancelRemindersBySourceIdPrefix = (prefix: string) =>
    setState((s) => ({
      ...s,
      reminders: s.reminders.map((r) =>
        r.sourceId?.startsWith(prefix) ? { ...r, completed: true } : r
      ),
    }));

  // ── Showings ──────────────────────────────────────────────────────────────

  const addShowing = (showing: Showing) =>
    setState((s) => ({ ...s, showings: [showing, ...s.showings] }));

  const updateShowing = (id: string, patch: Partial<Showing>) =>
    setState((s) => ({
      ...s, showings: s.showings.map((sh) => sh.id === id ? { ...sh, ...patch } : sh),
    }));

  const deleteShowing = (id: string) => {
    const now = new Date().toISOString();
    setState((s) => ({
      ...s, showings: s.showings.map((sh) => sh.id === id ? { ...sh, deletedAt: now } : sh),
    }));
  };

  // ── Offer rounds ──────────────────────────────────────────────────────────

  const addOfferRound = (round: OfferRound) =>
    setState((s) => ({ ...s, offerRounds: [round, ...s.offerRounds] }));

  const updateOfferRound = (id: string, patch: Partial<OfferRound>) =>
    setState((s) => ({
      ...s, offerRounds: s.offerRounds.map((r) => r.id === id ? { ...r, ...patch } : r),
    }));

  // ── Accepted offers ───────────────────────────────────────────────────────

  const addAcceptedOffer = (offer: AcceptedOffer) =>
    setState((s) => ({ ...s, acceptedOffers: [offer, ...s.acceptedOffers] }));

  const updateAcceptedOffer = (id: string, patch: Partial<AcceptedOffer>) =>
    setState((s) => ({
      ...s, acceptedOffers: s.acceptedOffers.map((o) => o.id === id ? { ...o, ...patch } : o),
    }));

  const removeAcceptedOffer = (id: string) =>
    setState((s) => ({ ...s, acceptedOffers: s.acceptedOffers.filter((o) => o.id !== id) }));

  // ── Offer conditions ──────────────────────────────────────────────────────

  const addOfferCondition = (condition: OfferCondition) =>
    setState((s) => ({ ...s, offerConditions: [condition, ...s.offerConditions] }));

  const updateOfferCondition = (id: string, patch: Partial<OfferCondition>) =>
    setState((s) => ({
      ...s, offerConditions: s.offerConditions.map((c) => c.id === id ? { ...c, ...patch } : c),
    }));

  // ── Checklist items ───────────────────────────────────────────────────────

  const addChecklistItems = (items: ChecklistItem[]) =>
    setState((s) => ({ ...s, checklistItems: [...items, ...s.checklistItems] }));

  const updateChecklistItem = (id: string, patch: Partial<ChecklistItem>) =>
    setState((s) => ({
      ...s, checklistItems: s.checklistItems.map((c) => c.id === id ? { ...c, ...patch } : c),
    }));

  // ── Listing details (Seller pipeline) ────────────────────────────────────

  const addListingDetails = (ld: ListingDetails) =>
    setState((s) => ({ ...s, listingDetails: [ld, ...s.listingDetails] }));

  const updateListingDetails = (id: string, patch: Partial<ListingDetails>) =>
    setState((s) => ({
      ...s, listingDetails: s.listingDetails.map((ld) => ld.id === id ? { ...ld, ...patch } : ld),
    }));

  // ── Seller multi-offer ────────────────────────────────────────────────────

  const addSellerOfferThread = (thread: SellerOfferThread) =>
    setState((s) => ({ ...s, sellerOfferThreads: [thread, ...s.sellerOfferThreads] }));

  const updateSellerOfferThread = (id: string, patch: Partial<SellerOfferThread>) =>
    setState((s) => ({
      ...s, sellerOfferThreads: s.sellerOfferThreads.map((t) => t.id === id ? { ...t, ...patch } : t),
    }));

  const addSellerOfferRound = (round: SellerOfferRound) =>
    setState((s) => ({ ...s, sellerOfferRounds: [round, ...s.sellerOfferRounds] }));

  const updateSellerOfferRound = (id: string, patch: Partial<SellerOfferRound>) =>
    setState((s) => ({
      ...s, sellerOfferRounds: s.sellerOfferRounds.map((r) => r.id === id ? { ...r, ...patch } : r),
    }));

  // ── Landlord rental ───────────────────────────────────────────────────────

  const addRentalApplication = (app: RentalApplication) =>
    setState((s) => ({ ...s, rentalApplications: [app, ...s.rentalApplications] }));

  const updateRentalApplication = (id: string, patch: Partial<RentalApplication>) =>
    setState((s) => ({
      ...s, rentalApplications: s.rentalApplications.map((a) => a.id === id ? { ...a, ...patch } : a),
    }));

  const addLeaseDetails = (lease: LeaseDetails) =>
    setState((s) => ({ ...s, leaseDetails: [lease, ...s.leaseDetails] }));

  const updateLeaseDetails = (id: string, patch: Partial<LeaseDetails>) =>
    setState((s) => ({
      ...s, leaseDetails: s.leaseDetails.map((l) => l.id === id ? { ...l, ...patch } : l),
    }));

  // ── Tenant application ────────────────────────────────────────────────────────

  const addTenantApplication = (app: TenantApplication) =>
    setState((s) => ({ ...s, tenantApplications: [app, ...s.tenantApplications] }));

  const updateTenantApplication = (id: string, patch: Partial<TenantApplication>) =>
    setState((s) => ({
      ...s, tenantApplications: s.tenantApplications.map((a) => a.id === id ? { ...a, ...patch } : a),
    }));

  const addTenantLeaseDetails = (lease: TenantLeaseDetails) =>
    setState((s) => ({ ...s, tenantLeaseDetails: [lease, ...s.tenantLeaseDetails] }));

  const updateTenantLeaseDetails = (id: string, patch: Partial<TenantLeaseDetails>) =>
    setState((s) => ({
      ...s, tenantLeaseDetails: s.tenantLeaseDetails.map((l) => l.id === id ? { ...l, ...patch } : l),
    }));

  const addSellerShowing = (s: SellerShowing) =>
    setState((p) => ({ ...p, sellerShowings: [...p.sellerShowings, s] }));

  const addOpenHouse = (o: OpenHouse) =>
    setState((p) => ({ ...p, openHouses: [...p.openHouses, o] }));

  const addRecruitOffer = (offer: RecruitOffer) =>
    setState((p) => ({ ...p, recruitOffers: [...p.recruitOffers, offer] }));

  const updateRecruitOffer = (id: string, patch: Partial<RecruitOffer>) =>
    setState((p) => ({ ...p, recruitOffers: p.recruitOffers.map((o) => o.id === id ? { ...o, ...patch } : o) }));

  // ── Buyer agreements ──────────────────────────────────────────────────────────

  const addBuyerAgreement = (agreement: BuyerAgreement) =>
    setState((p) => ({ ...p, buyerAgreements: [agreement, ...p.buyerAgreements] }));

  const updateBuyerAgreement = (id: string, patch: Partial<BuyerAgreement>) =>
    setState((p) => ({ ...p, buyerAgreements: p.buyerAgreements.map((a) => a.id === id ? { ...a, ...patch } : a) }));

  // ── Buyer offer threads ───────────────────────────────────────────────────────

  const addBuyerOfferThread = (thread: BuyerOfferThread) =>
    setState((p) => ({ ...p, buyerOfferThreads: [thread, ...p.buyerOfferThreads] }));

  const updateBuyerOfferThread = (id: string, patch: Partial<BuyerOfferThread>) =>
    setState((p) => ({ ...p, buyerOfferThreads: p.buyerOfferThreads.map((t) => t.id === id ? { ...t, ...patch } : t) }));

  const resetStore = (redirectTo?: string) => {
    // Block the save effect first, then write defaultState synchronously, so the
    // in-memory (old) state can't be written back before the page goes away.
    resettingRef.current = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ __version: STORE_VERSION, ...defaultState })); } catch {}
    try { localStorage.removeItem(WELCOME_BANNER_DISMISSED_KEY); } catch {} // bring the welcome banner back
    if (redirectTo) location.replace(redirectTo);
    else location.reload();
  };

  return (
    <StoreContext.Provider value={{
      ...state,
      addLead, updateLead,
      addActivity,
      addReminder, completeReminder, snoozeReminder, cancelRemindersBySourceId, cancelRemindersBySourceIdPrefix,
      addShowing, updateShowing, deleteShowing,
      addOfferRound, updateOfferRound,
      addAcceptedOffer, updateAcceptedOffer, removeAcceptedOffer,
      addOfferCondition, updateOfferCondition,
      addChecklistItems, updateChecklistItem,
      addListingDetails, updateListingDetails,
      addSellerOfferThread, updateSellerOfferThread,
      addSellerOfferRound, updateSellerOfferRound,
      addRentalApplication, updateRentalApplication,
      addLeaseDetails, updateLeaseDetails,
      addTenantApplication, updateTenantApplication,
      addTenantLeaseDetails, updateTenantLeaseDetails,
      addSellerShowing, addOpenHouse,
      addRecruitOffer, updateRecruitOffer,
      addBuyerAgreement, updateBuyerAgreement,
      addBuyerOfferThread, updateBuyerOfferThread,
      resetStore,
    }}>
      {/* Render the app only once the browser has loaded its data. The demo data
          is built relative to "now" (lib/mock-data.ts) and saved data lives in
          localStorage — neither exists on the server, so server-rendering it would
          cause hydration mismatches and a flash of default data. */}
      {hydrated ? children : null}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
