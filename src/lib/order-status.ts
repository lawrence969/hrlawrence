// Canonical order status, priority, follow-up reason, and contact method constants.

export const CANONICAL_STATUSES = [
  "intake",
  "follow_up",
  "in_design",
  "waiting_for_client",
  "in_production",
  "on_hold",
  "work_complete",
  "ready_for_pickup",
  "picked_up",
  "no_follow_up_needed",
] as const;

export type OrderStatus = typeof CANONICAL_STATUSES[number];

export const statusLabels: Record<string, string> = {
  intake: "Intake",
  follow_up: "Follow Up",
  in_design: "In Design",
  waiting_for_client: "Waiting For Client",
  in_production: "In Production",
  on_hold: "On Hold",
  work_complete: "Work Complete",
  ready_for_pickup: "Ready For Pickup",
  picked_up: "Picked Up",
  no_follow_up_needed: "No Follow-Up Needed",
};

export const statusDescriptions: Record<string, string> = {
  intake: "Order just received. Details being captured.",
  follow_up: "Active follow-up required with the client.",
  in_design: "Design work is underway (custom pieces).",
  waiting_for_client: "Waiting for the client's decision, approval, or response.",
  in_production: "In production — casting, setting, or bench work.",
  on_hold: "Blocked. Requires a blocked reason.",
  work_complete: "Bench work finished, awaiting final QA/handoff.",
  ready_for_pickup: "Ready for client to pick up.",
  picked_up: "Client has taken possession. Order closed.",
  no_follow_up_needed: "No further follow-up needed on this order.",
};

export const statusColor = (status: string) => {
  switch (status) {
    case "intake": return "bg-secondary text-secondary-foreground";
    case "follow_up":
      return "bg-violet-100 text-violet-800";
    case "in_design":
    case "in_production":
    case "work_complete":
      return "bg-accent/20 text-accent";
    case "waiting_for_client":
      return "bg-amber-100 text-amber-800";
    case "ready_for_pickup":
      return "bg-green-100 text-green-800";
    case "picked_up":
      return "bg-muted text-muted-foreground";
    case "on_hold":
      return "bg-orange-100 text-orange-800";
    case "no_follow_up_needed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-secondary text-secondary-foreground";
  }
};

// Legacy → canonical mapping used to display any residual old value.
export const normalizeStatus = (s: string): string => {
  switch (s) {
    case "complete": return "work_complete";
    case "delivered": return "picked_up";
    case "in_progress":
    case "quote_approved":
    case "ordered_stones":
    case "received_stones":
    case "design_approved":
    case "quote_sent":
      return "in_production";
    case "larry_follow_up": return "waiting_for_client";
    case "no_follow_up_client": return "no_follow_up_needed";
    case "ready_pickup": return "ready_for_pickup";
    default: return s;
  }
};

// Status flows per order type
export const repairStatusFlow: OrderStatus[] = [
  "intake", "follow_up", "in_production", "waiting_for_client", "work_complete", "ready_for_pickup", "picked_up",
];
export const customStatusFlow: OrderStatus[] = [
  "intake", "follow_up", "in_design", "waiting_for_client", "in_production", "work_complete", "ready_for_pickup", "picked_up",
];
export const showroomStatusFlow: OrderStatus[] = [
  "intake", "follow_up", "work_complete", "picked_up",
];

export const getStatusFlow = (orderType: string): OrderStatus[] => {
  if (orderType === "repair") return repairStatusFlow;
  if (orderType === "showroom") return showroomStatusFlow;
  return customStatusFlow;
};

export const COMPLETE_STATUSES = new Set(["work_complete", "picked_up", "no_follow_up_needed"]);

// Priorities
export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = typeof PRIORITIES[number];
export const priorityLabels: Record<string, string> = {
  low: "Low", normal: "Normal", high: "High", urgent: "Urgent",
};
export const priorityColor = (p: string) => {
  switch (p) {
    case "urgent": return "bg-red-100 text-red-800 border-red-300";
    case "high": return "bg-orange-100 text-orange-800 border-orange-300";
    case "low": return "bg-slate-100 text-slate-600 border-slate-300";
    default: return "bg-secondary text-secondary-foreground border-border";
  }
};

// Follow-up reasons
export const FOLLOW_UP_REASONS = [
  "waiting_client_approval",
  "waiting_deposit",
  "waiting_stone",
  "design_update",
  "production_update",
  "ready_for_pickup",
  "quote_follow_up",
  "general_check_in",
  "no_follow_up_needed",
] as const;

export const followUpReasonLabels: Record<string, string> = {
  waiting_client_approval: "Waiting for client approval",
  waiting_deposit: "Waiting for deposit",
  waiting_stone: "Waiting for stone",
  design_update: "Design update needed",
  production_update: "Production update needed",
  ready_for_pickup: "Ready for pickup",
  quote_follow_up: "Quote follow-up",
  general_check_in: "General check-in",
  no_follow_up_needed: "No follow-up needed",
};

// Contact methods
export const CONTACT_METHODS = ["phone", "text", "email", "any"] as const;
export const contactMethodLabels: Record<string, string> = {
  phone: "Phone", text: "Text", email: "Email", any: "Any",
};

// Interaction types
export const INTERACTION_TYPES = ["call", "text", "email", "voicemail", "in_person", "note"] as const;
export const interactionTypeLabels: Record<string, string> = {
  call: "Call",
  text: "Text",
  email: "Email",
  voicemail: "Voicemail",
  in_person: "In-person",
  note: "Internal note",
};

// Simple validators
export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
export const formatPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
};
