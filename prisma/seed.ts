import { PrismaClient, type MovementType, type Prisma } from "@prisma/client";

const db = new PrismaClient();

const DAY = 86_400_000;
const NOW = Date.now();
const at = (daysAgo: number, hour = 10) => {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const r2 = (n: number) => Math.round(n * 100) / 100;
const ym = (() => {
  const d = new Date();
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

// [sku, name, nameAr, category, unit, avgCost, calories per unit, allergens, highValue]
const ITEMS: [string, string, string, string, string, number, number | null, string[], boolean][] = [
  ["CHK", "Chicken breast", "صدر دجاج", "Meat & poultry", "kg", 24, 1650, [], true],
  ["LMB", "Lamb shoulder", "كتف غنم", "Meat & poultry", "kg", 62, 2820, [], true],
  ["BEF", "Beef mince", "لحم بقري مفروم", "Meat & poultry", "kg", 45, 2540, [], true],
  ["SHR", "Shrimp (peeled)", "روبيان مقشر", "Seafood", "kg", 70, 990, ["Shellfish"], true],
  ["RIC", "Basmati rice", "أرز بسمتي", "Dry goods", "kg", 7.5, 3600, [], false],
  ["TOM", "Tomatoes", "طماطم", "Produce", "kg", 4.2, 180, [], false],
  ["ONI", "Onions", "بصل", "Produce", "kg", 2.8, 400, [], false],
  ["LET", "Lettuce", "خس", "Produce", "kg", 6, 150, [], false],
  ["CUC", "Cucumber", "خيار", "Produce", "kg", 4.5, 150, [], false],
  ["LEM", "Lemons", "ليمون", "Produce", "kg", 6.5, 290, [], false],
  ["PRS", "Parsley", "بقدونس", "Produce", "kg", 9, 360, [], false],
  ["GAR", "Garlic", "ثوم", "Produce", "kg", 12, 1490, [], false],
  ["POT", "Potatoes", "بطاطس", "Produce", "kg", 3.5, 770, [], false],
  ["CHP", "Chickpeas", "حمص حب", "Dry goods", "kg", 6, 3640, [], false],
  ["THN", "Tahini", "طحينة", "Dry goods", "kg", 18, 5950, ["Sesame"], false],
  ["OLV", "Olive oil", "زيت زيتون", "Dry goods", "L", 28, 8840, [], false],
  ["VEG", "Vegetable oil", "زيت نباتي", "Dry goods", "L", 8, 8840, [], false],
  ["FLR", "Flour", "دقيق", "Dry goods", "kg", 3, 3640, ["Gluten"], false],
  ["PIT", "Arabic bread", "خبز عربي", "Bakery", "pcs", 0.35, 165, ["Gluten"], false],
  ["SPC", "Kabsa spice mix", "بهارات كبسة", "Dry goods", "kg", 35, 2500, [], false],
  ["SUG", "Sugar", "سكر", "Dry goods", "kg", 4, 3870, [], false],
  ["DAT", "Sukkari dates", "تمر سكري", "Dry goods", "kg", 30, 2820, [], false],
  ["YOG", "Yogurt", "زبادي", "Dairy", "kg", 9, 610, ["Milk"], false],
  ["CHE", "Halloumi cheese", "جبن حلوم", "Dairy", "kg", 42, 3210, ["Milk"], true],
  ["MLK", "Fresh milk", "حليب طازج", "Dairy", "L", 6.5, 640, ["Milk"], false],
  ["COF", "Coffee beans", "حبوب قهوة", "Coffee", "kg", 95, 0, [], true],
  ["CRD", "Cardamom", "هيل", "Coffee", "kg", 120, 3110, [], true],
];

// [code, name, nameAr, category, price, base daily qty, recipe]
const MENU: [string, string, string, string, number, number, [string, number][]][] = [
  ["M01", "Chicken shawarma plate", "صحن شاورما دجاج", "Mains", 38, 70, [["CHK", 0.22], ["PIT", 2], ["GAR", 0.02], ["YOG", 0.05], ["TOM", 0.05], ["POT", 0.15], ["VEG", 0.03], ["SPC", 0.01]]],
  ["M02", "Chicken kabsa", "كبسة دجاج", "Mains", 52, 45, [["CHK", 0.35], ["RIC", 0.25], ["ONI", 0.05], ["TOM", 0.06], ["SPC", 0.015], ["VEG", 0.03]]],
  ["M03", "Lamb mandi", "مندي لحم", "Mains", 95, 25, [["LMB", 0.55], ["RIC", 0.3], ["ONI", 0.05], ["SPC", 0.02], ["VEG", 0.03]]],
  ["M04", "Mixed grill platter", "مشاوي مشكلة", "Mains", 89, 18, [["LMB", 0.25], ["CHK", 0.2], ["BEF", 0.15], ["PIT", 2], ["TOM", 0.08], ["ONI", 0.05], ["SPC", 0.015]]],
  ["M05", "Garlic shrimp", "روبيان بالثوم", "Mains", 75, 10, [["SHR", 0.35], ["RIC", 0.2], ["GAR", 0.03], ["LEM", 0.05], ["OLV", 0.03]]],
  ["M06", "Beef burger", "برجر لحم", "Mains", 42, 30, [["BEF", 0.18], ["FLR", 0.08], ["LET", 0.03], ["TOM", 0.03], ["CHE", 0.03], ["POT", 0.2], ["VEG", 0.04]]],
  ["M07", "Hummus", "حمص", "Starters", 22, 40, [["CHP", 0.12], ["THN", 0.04], ["OLV", 0.02], ["LEM", 0.02], ["GAR", 0.01], ["PRS", 0.01], ["PIT", 1]]],
  ["M08", "Fattoush", "فتوش", "Starters", 26, 30, [["LET", 0.1], ["TOM", 0.08], ["CUC", 0.08], ["PRS", 0.02], ["PIT", 0.5], ["OLV", 0.02], ["LEM", 0.02]]],
  ["M09", "Halloumi salad", "سلطة حلوم", "Starters", 34, 15, [["CHE", 0.1], ["LET", 0.08], ["TOM", 0.06], ["CUC", 0.06], ["OLV", 0.02]]],
  ["M10", "French fries", "بطاطس مقلية", "Sides", 14, 50, [["POT", 0.3], ["VEG", 0.05]]],
  ["M11", "Saudi coffee and dates", "قهوة سعودية وتمر", "Drinks", 25, 25, [["COF", 0.03], ["CRD", 0.006], ["DAT", 0.06]]],
  ["M12", "Spanish latte", "سبانش لاتيه", "Drinks", 21, 45, [["COF", 0.018], ["MLK", 0.25], ["SUG", 0.015]]],
  ["M13", "Kunafa", "كنافة", "Desserts", 32, 20, [["CHE", 0.12], ["FLR", 0.1], ["SUG", 0.05], ["MLK", 0.1], ["VEG", 0.02]]],
];

const BRANCHES = [
  { code: "OLY", name: "Olaya", nameAr: "العليا", district: "Olaya, Riyadh", districtAr: "العليا، الرياض", factor: 1.2 },
  { code: "MLQ", name: "Al Malqa", nameAr: "الملقا", district: "Al Malqa, Riyadh", districtAr: "الملقا، الرياض", factor: 1.0 },
  { code: "NRJ", name: "An Narjis", nameAr: "النرجس", district: "An Narjis, Riyadh", districtAr: "النرجس، الرياض", factor: 0.8 },
];

// [key, name, nameAr, category, categoryAr, leadTime, minOrder, catalog [sku, price, packSize, minQty, previousPrice?]]
const SUPPLIERS: [string, string, string, string, string, number, number, [string, number, number, number, number?][]][] = [
  ["fresh", "Fresh Farms Poultry & Meat", "مزارع فريش للدواجن واللحوم", "Meat & poultry", "لحوم ودواجن", 1, 500, [["CHK", 24, 5, 10], ["LMB", 62, 5, 5], ["BEF", 45, 5, 5]]],
  ["qassim", "Al Qassim Meats", "لحوم القصيم", "Meat & poultry", "لحوم ودواجن", 2, 800, [["CHK", 23.2, 10, 20], ["LMB", 60.5, 5, 10], ["BEF", 46, 5, 10]]],
  ["wadi", "Al Wadi Fresh Produce", "الوادي للخضار والفواكه", "Produce", "خضار وفواكه", 1, 200, [["TOM", 4.2, 5, 5], ["ONI", 2.8, 10, 10], ["LET", 6, 2, 2], ["CUC", 4.5, 5, 5], ["LEM", 6.5, 2, 2], ["PRS", 9, 1, 1], ["GAR", 12, 1, 1], ["POT", 3.5, 10, 10]]],
  ["gulf", "Gulf Seafood Co.", "شركة الخليج للمأكولات البحرية", "Seafood", "مأكولات بحرية", 2, 800, [["SHR", 78, 2, 4, 70]]],
  ["redsea", "Red Sea Fish Market", "سوق البحر الأحمر للأسماك", "Seafood", "مأكولات بحرية", 3, 600, [["SHR", 72, 2, 4]]],
  ["dry", "Riyadh Dry Goods Trading", "الرياض لتجارة المواد الغذائية", "Dry goods", "مواد غذائية جافة", 2, 300, [["RIC", 7.5, 10, 10], ["CHP", 6, 5, 5], ["THN", 18, 1, 2], ["OLV", 28, 5, 5], ["VEG", 8, 10, 10], ["FLR", 3, 25, 25], ["PIT", 0.35, 50, 100], ["SPC", 35, 1, 1], ["SUG", 4, 10, 10], ["DAT", 30, 3, 3]]],
  ["najd", "Najd Dairy & Coffee", "نجد للألبان والقهوة", "Dairy & coffee", "ألبان وقهوة", 2, 300, [["YOG", 9, 2, 2], ["CHE", 42, 2, 2], ["MLK", 6.5, 6, 6], ["COF", 95, 1, 1], ["CRD", 120, 0.5, 0.5]]],
];

// Unexplained loss rate found at weekly counts, by branch and item. Olaya chicken is the story.
const LOSS: Record<string, number> = { "OLY:CHK": 0.12, "OLY:LMB": 0.045, "OLY:BEF": 0.05, "MLQ:CHK": 0.03, "NRJ:CHE": 0.07, "MLQ:SHR": 0.06 };

const noise = (a: number, b: number) => (((a * 7 + b * 13) % 11) - 5) / 50;
const dayFactor = (daysAgo: number) => {
  const dow = new Date(NOW - daysAgo * DAY).getDay();
  return dow === 4 || dow === 5 ? 1.3 : 1;
};

async function reset() {
  await db.auditLog.deleteMany();
  await db.lead.deleteMany();
  await db.quote.deleteMany();
  await db.rfq.deleteMany();
  await db.pOLine.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.stockCountLine.deleteMany();
  await db.stockCount.deleteMany();
  await db.sale.deleteMany();
  await db.recipeLine.deleteMany();
  await db.menuItem.deleteMany();
  await db.stockMovement.deleteMany();
  await db.stock.deleteMany();
  await db.catalogItem.deleteMany();
  await db.user.deleteMany();
  await db.item.deleteMany();
  await db.supplier.deleteMany();
  await db.branch.deleteMany();
  await db.organization.deleteMany();
}

async function main() {
  await reset();

  const org = await db.organization.create({ data: { name: "Al Nakheel Restaurants", nameAr: "مطاعم النخيل", approvalThreshold: 5000 } });
  const branches = await Promise.all(
    BRANCHES.map(({ factor: _f, ...b }) => db.branch.create({ data: { ...b, orgId: org.id } })),
  );
  const branchByCode = Object.fromEntries(branches.map((b) => [b.code, b]));
  const factorByCode = Object.fromEntries(BRANCHES.map((b) => [b.code, b.factor]));

  await db.item.createMany({
    data: ITEMS.map(([sku, name, nameAr, category, unit, avgCost, calories, allergens, highValue]) => ({
      orgId: org.id, sku, name, nameAr, category, unit, avgCost, calories, allergens, highValue,
    })),
  });
  const items = await db.item.findMany({ where: { orgId: org.id } });
  const item = Object.fromEntries(items.map((i) => [i.sku, i]));

  const suppliers: Record<string, { id: string; leadTimeDays: number; catalog: Map<string, number> }> = {};
  for (const [key, name, nameAr, category, categoryAr, leadTimeDays, minOrder, catalog] of SUPPLIERS) {
    const s = await db.supplier.create({ data: { name, nameAr, category, categoryAr, city: "Riyadh", leadTimeDays, minOrder } });
    await db.catalogItem.createMany({
      data: catalog.map(([sku, price, packSize, minQty, previousPrice]) => ({
        supplierId: s.id, itemId: item[sku].id, price, packSize, minQty, previousPrice: previousPrice ?? null,
      })),
    });
    suppliers[key] = { id: s.id, leadTimeDays, catalog: new Map(catalog.map(([sku, price]) => [sku, price])) };
  }
  const preferred: Record<string, string> = {};
  for (const key of ["fresh", "wadi", "gulf", "dry", "najd"]) for (const sku of suppliers[key].catalog.keys()) preferred[sku] = key;

  const [faisal, noura, khalid] = await Promise.all([
    db.user.create({ data: { email: "faisal@alnakheel.sa", name: "Faisal Al Otaibi", nameAr: "فيصل العتيبي", title: "Owner, Al Nakheel Restaurants", titleAr: "المالك، مطاعم النخيل", role: "OWNER", orgId: org.id } }),
    db.user.create({ data: { email: "noura@alnakheel.sa", name: "Noura Al Qahtani", nameAr: "نورة القحطاني", title: "Branch manager, Olaya", titleAr: "مديرة فرع العليا", role: "MANAGER", orgId: org.id, branchId: branchByCode.OLY.id } }),
    db.user.create({ data: { email: "khalid@alnakheel.sa", name: "Khalid Al Harbi", nameAr: "خالد الحربي", title: "Purchasing manager", titleAr: "مدير المشتريات", role: "PURCHASER", orgId: org.id } }),
  ]);
  const omar = await db.user.create({ data: { email: "omar@alnakheel.sa", name: "Omar Al Shehri", nameAr: "عمر الشهري", title: "Branch manager, Al Malqa", titleAr: "مدير فرع الملقا", role: "MANAGER", orgId: org.id, branchId: branchByCode.MLQ.id } });
  await db.user.createMany({
    data: [
      { email: "saad@freshfarms.sa", name: "Saad Al Dosari", nameAr: "سعد الدوسري", title: "Sales, Fresh Farms Poultry & Meat", titleAr: "المبيعات، مزارع فريش", role: "SUPPLIER", supplierId: suppliers.fresh.id },
      { email: "hassan@gulfseafood.sa", name: "Hassan Al Zahrani", nameAr: "حسن الزهراني", title: "Sales, Gulf Seafood Co.", titleAr: "المبيعات، الخليج للمأكولات البحرية", role: "SUPPLIER", supplierId: suppliers.gulf.id },
      { email: "majed@alwadi.sa", name: "Majed Al Ghamdi", nameAr: "ماجد الغامدي", title: "Sales, Al Wadi Fresh Produce", titleAr: "المبيعات، الوادي للخضار", role: "SUPPLIER", supplierId: suppliers.wadi.id },
      { email: "sara@wateen-mvp.sa", name: "Sara Al Mutairi", nameAr: "سارة المطيري", title: "Customer success, Wateen-MVP", titleAr: "نجاح العملاء، وتين", role: "ADMIN" },
    ],
  });

  const menu: { id: string }[] = [];
  for (const [code, name, nameAr, category, price, , recipe] of MENU) {
    menu.push(
      await db.menuItem.create({
        data: { orgId: org.id, code, name, nameAr, category, price, lines: { create: recipe.map(([sku, qty]) => ({ itemId: item[sku].id, qty })) } },
      }),
    );
  }
  const plateCost = (recipe: [string, number][]) => recipe.reduce((s, [sku, q]) => s + q * item[sku].avgCost, 0);

  // 30 days of POS sales, recipe usage, waste, purchases and weekly counts per branch.
  const movements: Prisma.StockMovementCreateManyInput[] = [];
  const sales: Prisma.SaleCreateManyInput[] = [];
  const usage: Record<string, number> = {}; // `${branch}:${sku}` -> total qty over 30 days
  const move = (branchId: string, sku: string, type: MovementType, qty: number, createdAt: Date, extra: Partial<Prisma.StockMovementCreateManyInput> = {}) =>
    movements.push({ branchId, itemId: item[sku].id, type, qty: r2(qty), unitCost: item[sku].avgCost, createdAt, ...extra });

  for (const b of branches) {
    const f = factorByCode[b.code];
    for (let d = 30; d >= 1; d--) {
      const daily: Record<string, number> = {};
      MENU.forEach(([, , , , price, base, recipe], idx) => {
        const qty = Math.max(1, Math.round(base * f * dayFactor(d) * (1 + noise(d, idx))));
        sales.push({ branchId: b.id, menuItemId: menu[idx].id, qty, revenue: r2(qty * price), cost: r2(qty * plateCost(recipe)), batch: `POS-${b.code}-D${d}`, soldAt: at(d, 22) });
        for (const [sku, q] of recipe) daily[sku] = (daily[sku] ?? 0) + q * qty;
      });
      for (const [sku, q] of Object.entries(daily)) {
        move(b.id, sku, "SALE", -q, at(d, 23), { refType: "POS", refId: `POS-${b.code}-D${d}` });
        usage[`${b.code}:${sku}`] = (usage[`${b.code}:${sku}`] ?? 0) + q;
      }
      // Daily waste on perishables, heavier in the last week at Olaya.
      {
        const spike = b.code === "OLY" && d <= 7 ? 2.5 : 1;
        for (const [sku, rate] of [["TOM", 0.06], ["LET", 0.08], ["PRS", 0.1], ["MLK", 0.04], ["PIT", 0.05], ["CHK", 0.015], ["POT", 0.03]] as const) {
          const q = (daily[sku] ?? 0) * rate * spike;
          if (q > 0) move(b.id, sku, "WASTE", -q, at(d, 23), { note: sku === "MLK" ? "Expired" : "Spoiled" });
        }
      }
    }
  }

  // Stock levels: par covers lead time plus a few days, reorder point covers lead time plus a buffer.
  const avgDaily = (code: string, sku: string) => (usage[`${code}:${sku}`] ?? 0) / 30;
  const finalOnHand: Record<string, number> = {};
  const stockRows: Prisma.StockCreateManyInput[] = [];
  for (const b of branches) {
    for (const i of items) {
      const u = avgDaily(b.code, i.sku);
      const lead = suppliers[preferred[i.sku]].leadTimeDays;
      const perishable = ["Produce", "Dairy", "Bakery", "Meat & poultry", "Seafood"].includes(i.category);
      let par = Math.max(2, Math.ceil(u * (lead + (perishable ? 4 : 10))));
      let rop = Math.max(1, Math.ceil(u * (lead + 1.5)));
      let onHand = r2(par * 0.85);
      if (b.code === "OLY" && i.sku === "CHK") [par, rop, onHand] = [180, 100, 140];
      if (b.code === "MLQ" && i.sku === "LET") onHand = r2(u * 1.1);
      if (b.code === "NRJ" && i.sku === "CRD") onHand = 8;
      if (b.code === "OLY" && i.sku === "RIC") onHand = r2(rop * 0.8);
      stockRows.push({ branchId: b.id, itemId: i.id, onHand, parLevel: par, reorderPoint: rop });
      finalOnHand[`${b.code}:${i.sku}`] = onHand;
    }
  }
  await db.stock.createMany({ data: stockRows });

  // Purchase history: one received order per supplier and branch every few days.
  let poSeq = 0;
  const poNumber = () => `PO-${ym}-${String(++poSeq).padStart(4, "0")}`;
  const userIds = [noura.id, omar.id, khalid.id];
  for (const b of branches) {
    for (const key of ["fresh", "wadi", "gulf", "dry", "najd"]) {
      const s = suppliers[key];
      const every = key === "dry" || key === "najd" ? 7 : key === "gulf" ? 5 : 3;
      for (let d = 29; d >= 2; d -= every) {
        const lines = [...s.catalog.entries()]
          .map(([sku, price]) => ({ sku, price, qty: Math.ceil(avgDaily(b.code, sku) * every) }))
          .filter((l) => l.qty > 0);
        if (lines.length === 0) continue;
        // Al Wadi is often late and short; Gulf Seafood bills above the agreed price.
        const late = key === "wadi" && d % 2 === 1;
        const short = key === "wadi" && d % 3 === 0;
        const priceUp = key === "gulf" && d < 15;
        const total = r2(lines.reduce((sum, l) => sum + l.qty * l.price, 0));
        const created = at(d + s.leadTimeDays, 9);
        const expected = at(d, 8);
        const received = at(late ? d - 1 : d, 11);
        const po = await db.purchaseOrder.create({
          data: {
            number: poNumber(), orgId: org.id, branchId: b.id, supplierId: s.id, status: "RECEIVED", source: d % 2 ? "SUGGESTION" : "MARKETPLACE",
            total, createdById: userIds[d % 3], approvedById: total > 5000 ? khalid.id : null, createdAt: created, submittedAt: created,
            approvedAt: total > 5000 ? created : null, sentAt: created, confirmedAt: created, shippedAt: expected, expectedDate: expected, receivedAt: received,
            lines: {
              create: lines.map((l, idx) => ({
                itemId: item[l.sku].id, qty: l.qty, unitPrice: l.price,
                receivedQty: short && idx === 0 ? r2(l.qty * 0.85) : l.qty,
                receivedPrice: priceUp ? r2(l.price * 1.04) : l.price,
              })),
            },
          },
          include: { lines: true },
        });
        for (const l of po.lines) {
          const sku = items.find((i) => i.id === l.itemId)!.sku;
          move(b.id, sku, "RECEIVE", l.receivedQty!, received, { unitCost: l.receivedPrice!, refType: "PO", refId: po.id });
        }
      }
    }
  }

  // Weekly posted stock counts with the unexplained losses above.
  let countSeq = 0;
  for (const b of branches) {
    const manager = b.code === "MLQ" ? omar.id : b.code === "OLY" ? noura.id : faisal.id;
    for (const d of [28, 21, 14, 7]) {
      const lines = items.map((i, idx) => {
        const weekUse = avgDaily(b.code, i.sku) * 7;
        const rate = LOSS[`${b.code}:${i.sku}`] ?? (idx % 4 === 0 ? 0.02 : idx % 5 === 0 ? -0.005 : 0.008);
        const expectedQty = r2(Math.max(1, avgDaily(b.code, i.sku) * 4));
        const countedQty = r2(Math.max(0, expectedQty - weekUse * rate * (1 + noise(d, idx))));
        return { itemId: i.id, sku: i.sku, expectedQty, countedQty, unitCost: i.avgCost };
      });
      const count = await db.stockCount.create({
        data: {
          number: `CNT-${ym}-${String(++countSeq).padStart(4, "0")}`, branchId: b.id, status: "POSTED", userId: manager, createdAt: at(d, 7), postedAt: at(d, 8),
          lines: { create: lines.map(({ sku: _s, ...l }) => l) },
        },
      });
      for (const l of lines) {
        const diff = r2(l.countedQty - l.expectedQty);
        if (diff !== 0) move(b.id, l.sku, "COUNT_ADJUST", diff, at(d, 8), { refType: "COUNT", refId: count.id });
      }
    }
  }

  // Opening balances so every ledger reconciles to the current on-hand quantity.
  const net: Record<string, number> = {};
  const codeById = Object.fromEntries(branches.map((b) => [b.id, b.code]));
  const skuById = Object.fromEntries(items.map((i) => [i.id, i.sku]));
  for (const m of movements) {
    const k = `${codeById[m.branchId]}:${skuById[m.itemId]}`;
    net[k] = (net[k] ?? 0) + m.qty;
  }
  for (const b of branches) for (const i of items) move(b.id, i.sku, "OPENING", finalOnHand[`${b.code}:${i.sku}`] - (net[`${b.code}:${i.sku}`] ?? 0), at(31, 6));

  await db.sale.createMany({ data: sales });
  await db.stockMovement.createMany({ data: movements });

  // Live demo orders in progress.
  const live = async (
    branchCode: string, key: string, status: "PENDING_APPROVAL" | "SENT" | "SHIPPED", createdById: string, lines: [string, number][], note?: string,
  ) => {
    const s = suppliers[key];
    const total = r2(lines.reduce((sum, [sku, q]) => sum + q * s.catalog.get(sku)!, 0));
    const created = at(status === "SHIPPED" ? 1 : 0, 8);
    const po = await db.purchaseOrder.create({
      data: {
        number: poNumber(), orgId: org.id, branchId: branchByCode[branchCode].id, supplierId: s.id, status, source: "SUGGESTION", total, note, createdById,
        createdAt: created, submittedAt: created, sentAt: status === "PENDING_APPROVAL" ? null : created,
        confirmedAt: status === "SHIPPED" ? created : null, shippedAt: status === "SHIPPED" ? at(0, 7) : null,
        expectedDate: status === "PENDING_APPROVAL" ? null : at(0, 8),
        lines: { create: lines.map(([sku, qty]) => ({ itemId: item[sku].id, qty, unitPrice: s.catalog.get(sku)! })) },
      },
    });
    const creator = [noura, omar, khalid, faisal].find((u) => u.id === createdById)!;
    const events: [string, Date][] = [["CREATED", created], ["SUBMITTED", created]];
    if (status !== "PENDING_APPROVAL") events.push(["SENT", created]);
    if (status === "SHIPPED") events.push(["CONFIRMED", created], ["SHIPPED", at(0, 7)]);
    await db.auditLog.createMany({
      data: events.map(([action, createdAt]) => ({
        entity: "PO", entityId: po.id, action, createdAt,
        userName: ["CONFIRMED", "SHIPPED"].includes(action) ? SUPPLIERS.find((x) => x[0] === key)![1] : creator.name,
        userId: ["CONFIRMED", "SHIPPED"].includes(action) ? null : creator.id,
      })),
    });
    return po;
  };
  await live("OLY", "dry", "PENDING_APPROVAL", noura.id, [["RIC", 400], ["VEG", 120], ["SPC", 20], ["CHP", 80]], "Monthly dry store top-up before the weekend rush");
  await live("MLQ", "fresh", "SENT", omar.id, [["CHK", 60], ["LMB", 20]]);
  await live("OLY", "wadi", "SHIPPED", noura.id, [["TOM", 60], ["ONI", 40], ["LET", 20], ["CUC", 30], ["LEM", 10], ["POT", 80]]);

  // An open RFQ for shrimp with one quote in, so Gulf Seafood can respond live.
  const rfq = await db.rfq.create({
    data: {
      number: `RFQ-${ym}-0001`, orgId: org.id, branchId: branchByCode.MLQ.id, itemId: item.SHR.id, qty: 40, dueDate: at(-3, 17), createdById: khalid.id,
      note: "Monthly shrimp volume for all branches. Price must hold for 30 days.", createdAt: at(1, 10),
    },
  });
  await db.quote.create({ data: { rfqId: rfq.id, supplierId: suppliers.redsea.id, unitPrice: 71, leadTimeDays: 3, note: "Price held for 30 days", createdAt: at(0, 9) } });
  await db.auditLog.create({ data: { entity: "RFQ", entityId: rfq.id, action: "CREATED", userId: khalid.id, userName: khalid.name, createdAt: at(1, 10) } });

  await db.lead.createMany({
    data: [
      { name: "Abdullah Al Shammari", company: "Bayt Al Mandi", email: "abdullah@baytalmandi.sa", phone: "+966 55 210 4471", branches: 6, segment: "QSR", message: "We lose track of meat stock between branches.", createdAt: at(2, 14) },
      { name: "Reem Al Saud", company: "Roast & Co. Coffee", email: "reem@roastco.sa", phone: "+966 50 774 1290", branches: 3, segment: "Cafes & roasteries", message: "Need recipe costing for our drinks menu.", status: "CONTACTED", createdAt: at(5, 11) },
      { name: "Turki Al Anazi", company: "Najd Catering", email: "turki@najdcatering.sa", phone: "+966 54 330 8812", branches: 1, segment: "Catering", status: "QUALIFIED", createdAt: at(9, 16) },
    ],
  });

  console.log(`Seeded ${branches.length} branches, ${items.length} items, ${menu.length} menu items, ${sales.length} sales rows, ${movements.length} stock movements, ${poSeq} purchase orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
