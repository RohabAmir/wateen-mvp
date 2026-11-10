import type { POStatus, Role } from "@prisma/client";
import { round2 } from "./costing";

export type POAction = "SUBMIT" | "APPROVE" | "REJECT" | "CANCEL" | "CONFIRM" | "SHIP" | "RECEIVE";

const TRANSITIONS: Record<POAction, { from: POStatus[]; roles: Role[] }> = {
  SUBMIT: { from: ["DRAFT"], roles: ["OWNER", "MANAGER", "PURCHASER"] },
  APPROVE: { from: ["PENDING_APPROVAL"], roles: ["OWNER", "PURCHASER"] },
  REJECT: { from: ["PENDING_APPROVAL"], roles: ["OWNER", "PURCHASER"] },
  CANCEL: { from: ["DRAFT", "PENDING_APPROVAL", "SENT"], roles: ["OWNER", "MANAGER", "PURCHASER"] },
  CONFIRM: { from: ["SENT"], roles: ["SUPPLIER"] },
  SHIP: { from: ["CONFIRMED"], roles: ["SUPPLIER"] },
  RECEIVE: { from: ["SENT", "CONFIRMED", "SHIPPED"], roles: ["OWNER", "MANAGER"] },
};

export function canTransition(action: POAction, status: POStatus, role: Role): boolean {
  const t = TRANSITIONS[action];
  return t.from.includes(status) && t.roles.includes(role);
}

export function allowedActions(status: POStatus, role: Role): POAction[] {
  return (Object.keys(TRANSITIONS) as POAction[]).filter((a) => canTransition(a, status, role));
}

/** Orders above the organisation threshold need an approver; smaller ones go straight to the supplier. */
export function needsApproval(total: number, threshold: number): boolean {
  return total > threshold;
}

/** Segregation of duties: only the owner may approve an order they raised themselves. */
export function canApprove(role: Role, approverId: string, creatorId: string): boolean {
  if (role === "OWNER") return true;
  return role === "PURCHASER" && approverId !== creatorId;
}

export function orderTotal(lines: { qty: number; unitPrice: number }[]): number {
  return round2(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0));
}

export const VARIANCE_TOLERANCE = 0.02;

export interface ReceiptLineCheck {
  qty: number;
  unitPrice: number;
  receivedQty: number;
  receivedPrice: number;
}

/** Flags short or over deliveries and price differences beyond the 2% tolerance. */
export function receiptFlags(l: ReceiptLineCheck) {
  const qtyDiff = round2(l.receivedQty - l.qty);
  const priceDiff = round2(l.receivedPrice - l.unitPrice);
  return {
    short: l.receivedQty < l.qty * (1 - VARIANCE_TOLERANCE),
    over: l.receivedQty > l.qty * (1 + VARIANCE_TOLERANCE),
    priceUp: l.receivedPrice > l.unitPrice * (1 + VARIANCE_TOLERANCE),
    qtyDiff,
    priceDiff,
    valueImpact: round2(l.receivedQty * l.receivedPrice - l.qty * l.unitPrice),
  };
}

export interface SupplierOrderOutcome {
  expectedDate: Date | null;
  receivedAt: Date | null;
  lines: ReceiptLineCheck[];
  total: number;
}

/** On-time, in-full and price-accuracy rates over received orders, plus an overall score out of 100. */
export function supplierScore(orders: SupplierOrderOutcome[]) {
  const received = orders.filter((o) => o.receivedAt);
  if (received.length === 0) return { orders: 0, onTimePct: 0, inFullPct: 0, priceAccuracyPct: 0, score: 0, spend: 0 };
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const onTime = received.filter((o) => !o.expectedDate || o.receivedAt! <= endOfDay(o.expectedDate)).length;
  const inFull = received.filter((o) => o.lines.every((l) => !receiptFlags(l).short)).length;
  const priceOk = received.filter((o) => o.lines.every((l) => !receiptFlags(l).priceUp)).length;
  const pct = (n: number) => round2((n / received.length) * 100);
  const onTimePct = pct(onTime);
  const inFullPct = pct(inFull);
  const priceAccuracyPct = pct(priceOk);
  return {
    orders: received.length,
    onTimePct,
    inFullPct,
    priceAccuracyPct,
    score: Math.round(onTimePct * 0.4 + inFullPct * 0.4 + priceAccuracyPct * 0.2),
    spend: round2(received.reduce((s, o) => s + o.total, 0)),
  };
}
