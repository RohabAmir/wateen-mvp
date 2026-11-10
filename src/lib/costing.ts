export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface RecipeLineInput {
  qty: number;
  unitCost: number;
}

/** Plate cost of a recipe: the sum of each ingredient quantity times its weighted average cost. */
export function recipeCost(lines: RecipeLineInput[]): number {
  return round2(lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0));
}

/** Food cost as a percentage of the menu price. */
export function foodCostPct(cost: number, price: number): number {
  if (price <= 0) return 0;
  return round2((cost / price) * 100);
}

/** Price needed to hit a target food cost percentage. */
export function priceForTarget(cost: number, targetPct: number): number {
  return round2(cost / (targetPct / 100));
}

export type MenuClass = "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG";

export interface MenuPerformance {
  id: string;
  qtySold: number;
  price: number;
  cost: number;
}

/**
 * Menu engineering (Kasavana and Smith). An item is popular when its share of covers is at least
 * 70% of an even share, and profitable when its unit margin beats the sales-weighted average margin.
 */
export function classifyMenu(items: MenuPerformance[]): Record<string, MenuClass> {
  const totalQty = items.reduce((s, i) => s + i.qtySold, 0);
  const result: Record<string, MenuClass> = {};
  if (items.length === 0 || totalQty === 0) {
    for (const i of items) result[i.id] = "DOG";
    return result;
  }
  const popularityThreshold = (1 / items.length) * 0.7;
  const avgMargin = items.reduce((s, i) => s + (i.price - i.cost) * i.qtySold, 0) / totalQty;
  for (const i of items) {
    const popular = i.qtySold / totalQty >= popularityThreshold;
    const profitable = i.price - i.cost >= avgMargin;
    result[i.id] = popular ? (profitable ? "STAR" : "PLOWHORSE") : profitable ? "PUZZLE" : "DOG";
  }
  return result;
}

export interface FoodCostSummary {
  revenue: number;
  theoreticalCost: number;
  wasteCost: number;
  varianceCost: number;
  actualCost: number;
  theoreticalPct: number;
  actualPct: number;
}

/**
 * Actual food cost is what recipes say should have been used, plus recorded waste, plus
 * unexplained losses found at stock counts. varianceCost is positive when stock went missing.
 */
export function foodCostSummary(revenue: number, theoreticalCost: number, wasteCost: number, varianceCost: number): FoodCostSummary {
  const actualCost = round2(theoreticalCost + wasteCost + varianceCost);
  return {
    revenue: round2(revenue),
    theoreticalCost: round2(theoreticalCost),
    wasteCost: round2(wasteCost),
    varianceCost: round2(varianceCost),
    actualCost,
    theoreticalPct: foodCostPct(theoreticalCost, revenue),
    actualPct: foodCostPct(actualCost, revenue),
  };
}
