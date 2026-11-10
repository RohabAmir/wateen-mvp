import { describe, expect, it } from "vitest";
import { classifyMenu, foodCostPct, foodCostSummary, priceForTarget, recipeCost } from "./costing";
import { countVariance, daysOfCover, reorderSuggestion, stockState, variancePct, weightedAverageCost } from "./inventory";
import { allowedActions, canApprove, canTransition, needsApproval, orderTotal, receiptFlags, supplierScore } from "./procurement";
import { generateInsights, type InsightInput } from "./insights";

describe("recipe costing", () => {
  it("sums ingredient cost and computes food cost percentage", () => {
    const cost = recipeCost([
      { qty: 0.25, unitCost: 22 },
      { qty: 0.15, unitCost: 6.5 },
      { qty: 1, unitCost: 1.2 },
    ]);
    expect(cost).toBe(7.68);
    expect(foodCostPct(cost, 32)).toBe(24);
    expect(foodCostPct(5, 0)).toBe(0);
  });

  it("finds the price that hits a target food cost", () => {
    expect(priceForTarget(16, 32)).toBe(50);
  });

  it("adds waste and count losses to theoretical cost", () => {
    const s = foodCostSummary(100_000, 28_000, 1_500, 2_500);
    expect(s.actualCost).toBe(32_000);
    expect(s.theoreticalPct).toBe(28);
    expect(s.actualPct).toBe(32);
  });

  it("classifies menu items into stars, plowhorses, puzzles and dogs", () => {
    const c = classifyMenu([
      { id: "star", qtySold: 400, price: 60, cost: 15 },
      { id: "plow", qtySold: 400, price: 30, cost: 18 },
      { id: "puzzle", qtySold: 40, price: 90, cost: 25 },
      { id: "dog", qtySold: 30, price: 25, cost: 15 },
    ]);
    expect(c).toEqual({ star: "STAR", plow: "PLOWHORSE", puzzle: "PUZZLE", dog: "DOG" });
  });
});

describe("inventory", () => {
  it("updates the weighted average cost on receipt", () => {
    expect(weightedAverageCost(10, 20, 10, 26)).toBe(23);
    expect(weightedAverageCost(-4, 20, 10, 26)).toBe(26);
  });

  it("classifies stock state", () => {
    expect(stockState(0, 5, 20)).toBe("OUT");
    expect(stockState(5, 5, 20)).toBe("LOW");
    expect(stockState(12, 5, 20)).toBe("OK");
    expect(stockState(40, 5, 20)).toBe("OVER");
  });

  it("computes days of cover", () => {
    expect(daysOfCover(30, 10)).toBe(3);
    expect(daysOfCover(30, 0)).toBe(Infinity);
  });

  it("suggests nothing when stock is healthy", () => {
    expect(
      reorderSuggestion({ onHand: 50, onOrder: 0, parLevel: 60, reorderPoint: 20, avgDailyUsage: 5, leadTimeDays: 2, packSize: 1, minQty: 1 }),
    ).toBeNull();
  });

  it("tops up to par below the reorder point, net of open orders, in whole packs", () => {
    const s = reorderSuggestion({ onHand: 12, onOrder: 5, parLevel: 60, reorderPoint: 20, avgDailyUsage: 5, leadTimeDays: 2, packSize: 10, minQty: 1 });
    expect(s).toEqual({ qty: 50, reason: "BELOW_REORDER_POINT", forecastNeed: 20 });
  });

  it("orders ahead of a forecast stockout and respects the supplier minimum", () => {
    const s = reorderSuggestion({ onHand: 30, onOrder: 0, parLevel: 40, reorderPoint: 10, avgDailyUsage: 8, leadTimeDays: 3, packSize: 1, minQty: 15 });
    expect(s?.reason).toBe("FORECAST_STOCKOUT");
    expect(s?.qty).toBe(15);
  });

  it("measures count variance and variance percentage", () => {
    expect(countVariance({ expectedQty: 40, countedQty: 36.5, unitCost: 24 })).toEqual({ qty: -3.5, value: -84, lossValue: 84 });
    expect(variancePct(3.5, 70)).toBe(5);
    expect(variancePct(1, 0)).toBe(0);
  });
});

describe("procurement", () => {
  it("enforces the purchase order state machine by role", () => {
    expect(canTransition("APPROVE", "PENDING_APPROVAL", "PURCHASER")).toBe(true);
    expect(canTransition("APPROVE", "PENDING_APPROVAL", "MANAGER")).toBe(false);
    expect(canTransition("CONFIRM", "SENT", "SUPPLIER")).toBe(true);
    expect(canTransition("SHIP", "SENT", "SUPPLIER")).toBe(false);
    expect(canTransition("RECEIVE", "SHIPPED", "MANAGER")).toBe(true);
    expect(canTransition("RECEIVE", "RECEIVED", "MANAGER")).toBe(false);
    expect(allowedActions("RECEIVED", "OWNER")).toEqual([]);
  });

  it("requires approval above the threshold", () => {
    expect(needsApproval(5000, 5000)).toBe(false);
    expect(needsApproval(5000.01, 5000)).toBe(true);
  });

  it("stops purchasers approving their own orders", () => {
    expect(canApprove("PURCHASER", "u1", "u1")).toBe(false);
    expect(canApprove("PURCHASER", "u1", "u2")).toBe(true);
    expect(canApprove("OWNER", "u1", "u1")).toBe(true);
    expect(canApprove("MANAGER", "u1", "u2")).toBe(false);
  });

  it("totals lines and flags receipt variances beyond 2%", () => {
    expect(orderTotal([{ qty: 3, unitPrice: 10.5 }, { qty: 2, unitPrice: 4 }])).toBe(39.5);
    const f = receiptFlags({ qty: 50, unitPrice: 22, receivedQty: 45, receivedPrice: 23.5 });
    expect(f.short).toBe(true);
    expect(f.priceUp).toBe(true);
    expect(f.valueImpact).toBe(-42.5);
    const ok = receiptFlags({ qty: 50, unitPrice: 22, receivedQty: 49.5, receivedPrice: 22.3 });
    expect(ok.short || ok.priceUp || ok.over).toBe(false);
  });

  it("scores suppliers on time, in full and on price", () => {
    const d = (s: string) => new Date(s);
    const line = { qty: 10, unitPrice: 10, receivedQty: 10, receivedPrice: 10 };
    const s = supplierScore([
      { expectedDate: d("2026-11-02"), receivedAt: d("2026-11-02T15:00:00"), lines: [line], total: 100 },
      { expectedDate: d("2026-11-03"), receivedAt: d("2026-11-05T09:00:00"), lines: [{ ...line, receivedQty: 8 }], total: 80 },
      { expectedDate: null, receivedAt: null, lines: [line], total: 100 },
    ]);
    expect(s).toMatchObject({ orders: 2, onTimePct: 50, inFullPct: 50, priceAccuracyPct: 100, score: 60, spend: 180 });
  });
});

describe("insights", () => {
  const n = (en: string) => ({ en, ar: en });
  const base: InsightInput = { periodDays: 30, variance: [], priceChanges: [], cover: [], menu: [], waste: { last7: 0, prior7: 0 }, overstock: [] };

  it("flags large variances, price rises, stockouts and thin margins, ranked by severity and impact", () => {
    const list = generateInsights({
      ...base,
      variance: [
        { branchId: "b1", branch: n("Olaya"), item: n("Chicken"), unit: "kg", lossQty: 120, lossValue: 2640, theoreticalUsage: 1400 },
        { branchId: "b1", branch: n("Olaya"), item: n("Rice"), unit: "kg", lossQty: 2, lossValue: 12, theoreticalUsage: 800 },
      ],
      priceChanges: [{ supplier: n("Fresh Farms"), item: n("Tomato"), oldPrice: 4, newPrice: 4.6, monthlyQty: 600 }],
      cover: [{ branchId: "b1", branch: n("Olaya"), item: n("Lettuce"), unit: "kg", onHand: 3, daysCover: 0.8, leadTimeDays: 1, dailyValue: 40 }],
      menu: [
        { item: n("Mixed grill"), price: 65, cost: 31, qtySold: 300 },
        { item: n("Hummus"), price: 18, cost: 3, qtySold: 900 },
      ],
    });
    expect(list.map((i) => i.kind)).toEqual(["MARGIN", "VARIANCE", "PRICE", "STOCKOUT"]);
    expect(list.every((i) => i.severity === "high")).toBe(true);
    expect(list[1].impact).toBe(2640);
    expect(list.find((i) => i.kind === "PRICE")?.impact).toBe(360);
    // Cost above the 32% target: (31 - 65 x 0.32) x 300 plates.
    expect(list[0].impact).toBe(3060);
  });

  it("detects a waste spike and ignores small overstock", () => {
    const list = generateInsights({
      ...base,
      waste: { last7: 900, prior7: 400 },
      overstock: [{ branchId: "b2", branch: n("Malqa"), item: n("Saffron"), daysCover: 60, value: 300 }],
    });
    expect(list.map((i) => i.kind)).toEqual(["WASTE"]);
    expect(list[0].severity).toBe("high");
  });
});
