import { round2 } from "./costing";

/** Weighted average cost after receiving qty units at price. */
export function weightedAverageCost(onHand: number, avgCost: number, qty: number, price: number): number {
  const base = Math.max(0, onHand);
  if (base + qty <= 0) return round2(price);
  return round2((base * avgCost + qty * price) / (base + qty));
}

export type StockState = "OUT" | "LOW" | "OK" | "OVER";

export function stockState(onHand: number, reorderPoint: number, parLevel: number): StockState {
  if (onHand <= 0) return "OUT";
  if (onHand <= reorderPoint) return "LOW";
  if (onHand > parLevel * 1.5) return "OVER";
  return "OK";
}

/** Days the current stock lasts at the average daily usage. Infinity when the item is not used. */
export function daysOfCover(onHand: number, avgDailyUsage: number): number {
  if (avgDailyUsage <= 0) return Infinity;
  return Math.max(0, onHand) / avgDailyUsage;
}

export interface ReorderInput {
  onHand: number;
  onOrder: number;
  parLevel: number;
  reorderPoint: number;
  avgDailyUsage: number;
  leadTimeDays: number;
  packSize: number;
  minQty: number;
}

export interface ReorderSuggestion {
  qty: number;
  reason: "BELOW_REORDER_POINT" | "FORECAST_STOCKOUT";
  forecastNeed: number;
}

/**
 * Suggests an order when stock is at or below the reorder point, or when forecast usage over the
 * supplier lead time plus a two-day safety buffer would empty the shelf. Quantity tops the item up
 * to the larger of par level and forecast need, net of open orders, rounded up to whole packs and
 * the supplier minimum.
 */
export function reorderSuggestion(i: ReorderInput): ReorderSuggestion | null {
  const available = i.onHand + i.onOrder;
  const forecastNeed = round2(i.avgDailyUsage * (i.leadTimeDays + 2));
  const belowRop = available <= i.reorderPoint;
  const forecastShort = available < forecastNeed;
  if (!belowRop && !forecastShort) return null;

  const target = Math.max(i.parLevel, forecastNeed);
  let qty = target - available;
  if (qty <= 0) return null;
  const pack = i.packSize > 0 ? i.packSize : 1;
  qty = Math.ceil(qty / pack - 1e-9) * pack;
  qty = Math.max(qty, Math.ceil(i.minQty / pack - 1e-9) * pack);
  return { qty: round2(qty), reason: belowRop ? "BELOW_REORDER_POINT" : "FORECAST_STOCKOUT", forecastNeed };
}

export interface CountLineInput {
  expectedQty: number;
  countedQty: number;
  unitCost: number;
}

/** Count variance per line. Negative qty means stock is missing. lossValue is positive for losses. */
export function countVariance(l: CountLineInput) {
  const qty = round2(l.countedQty - l.expectedQty);
  return { qty, value: round2(qty * l.unitCost), lossValue: round2(-qty * l.unitCost) };
}

/** Variance as a percentage of theoretical usage over the same period. */
export function variancePct(lossQty: number, theoreticalUsage: number): number {
  if (theoreticalUsage <= 0) return 0;
  return round2((lossQty / theoreticalUsage) * 100);
}
