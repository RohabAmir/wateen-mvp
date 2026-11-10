type L = { en: string; ar: string };

export interface Service {
  slug: string;
  icon: string;
  title: L;
  short: L;
  hero: L;
  points: { title: L; body: L }[];
  demo: { href: string; label: L };
}

export const SERVICES: Service[] = [
  {
    slug: "inventory",
    icon: "▦",
    title: { en: "Inventory management", ar: "إدارة المخزون" },
    short: {
      en: "Live stock per branch, recipe-based usage, waste, transfers and counts that expose every riyal of variance.",
      ar: "مخزون لحظي لكل فرع، واستهلاك مبني على الوصفات، وهدر وتحويلات وجرد يكشف كل ريال من الفروقات.",
    },
    hero: { en: "Know exactly where every kilo went", ar: "اعرف أين ذهب كل كيلو" },
    points: [
      { title: { en: "Recipe-based deduction", ar: "خصم حسب الوصفة" }, body: { en: "Every POS sale deducts its ingredients, so stock is right without manual entry.", ar: "كل عملية بيع تخصم مكوناتها تلقائياً فيبقى المخزون دقيقاً دون إدخال يدوي." } },
      { title: { en: "Stock counts and variance", ar: "الجرد والفروقات" }, body: { en: "Compare what recipes say you used with what is on the shelf, item by item, in riyals.", ar: "قارن ما تقوله الوصفات مع ما هو موجود فعلاً، صنفاً بصنف وبالريال." } },
      { title: { en: "Waste and transfers", ar: "الهدر والتحويلات" }, body: { en: "Log spoilage with a reason and move stock between branches in one step.", ar: "سجّل التالف مع السبب وانقل المخزون بين الفروع بخطوة واحدة." } },
      { title: { en: "Digital cookbook", ar: "كتاب وصفات رقمي" }, body: { en: "Standard recipes with live plate cost, calories and allergens for every menu item.", ar: "وصفات موحدة بتكلفة طبق محدثة وسعرات ومسببات حساسية لكل صنف." } },
    ],
    demo: { href: "/login", label: { en: "Try it as Noura, branch manager", ar: "جرّبه كنورة، مديرة الفرع" } },
  },
  {
    slug: "procurement",
    icon: "⇄",
    title: { en: "E-procurement", ar: "المشتريات الإلكترونية" },
    short: {
      en: "Smart reorder suggestions, approval workflows, RFQs and receiving that catches short deliveries and price creep.",
      ar: "اقتراحات طلب ذكية، ومسارات موافقة، وطلبات عروض أسعار، واستلام يكشف النقص وارتفاع الأسعار.",
    },
    hero: { en: "Never run out. Never overpay.", ar: "لا نفاد للمخزون. ولا دفع زائد." },
    points: [
      { title: { en: "Smart order suggestions", ar: "اقتراحات طلب ذكية" }, body: { en: "Par levels plus usage forecasts tell you what to order, from whom and how much.", ar: "الحدود القصوى وتوقعات الاستهلاك تخبرك ماذا تطلب ومن من وبأي كمية." } },
      { title: { en: "Approval workflows", ar: "مسارات الموافقة" }, body: { en: "Orders above your limit wait for an approver, with a full audit trail.", ar: "الطلبات فوق الحد تنتظر موافقة المسؤول مع سجل تدقيق كامل." } },
      { title: { en: "RFQs and quote comparison", ar: "طلبات العروض والمقارنة" }, body: { en: "Send one request to several suppliers and award the best offer in a click.", ar: "أرسل طلباً واحداً لعدة موردين واختر أفضل عرض بنقرة." } },
      { title: { en: "Receiving with variance checks", ar: "استلام مع فحص الفروقات" }, body: { en: "Short deliveries and price differences are flagged and feed the supplier scorecard.", ar: "النقص وفروقات الأسعار تُرصد وتدخل في تقييم المورد." } },
    ],
    demo: { href: "/login", label: { en: "Try it as Khalid, purchasing", ar: "جرّبه كخالد، المشتريات" } },
  },
  {
    slug: "marketplace",
    icon: "◈",
    title: { en: "Supplier marketplace", ar: "سوق الموردين" },
    short: {
      en: "Buyers order straight from supplier catalogues. Suppliers confirm, ship and quote from their own portal.",
      ar: "يطلب المشترون مباشرة من كتالوجات الموردين، ويؤكد الموردون ويشحنون ويقدمون العروض من بوابتهم.",
    },
    hero: { en: "One marketplace for buyers and suppliers", ar: "سوق واحد للمشترين والموردين" },
    points: [
      { title: { en: "Live catalogues", ar: "كتالوجات محدثة" }, body: { en: "Prices, pack sizes and minimum orders kept up to date by the suppliers themselves.", ar: "الأسعار وأحجام العبوات والحد الأدنى للطلب يحدّثها الموردون بأنفسهم." } },
      { title: { en: "Order tracking", ar: "تتبع الطلبات" }, body: { en: "Sent, confirmed, out for delivery, received. Everyone sees the same status.", ar: "مُرسل، مؤكد، قيد التوصيل، مستلم. الجميع يرى نفس الحالة." } },
      { title: { en: "Supplier portal", ar: "بوابة الموردين" }, body: { en: "Suppliers manage orders and answer RFQs without phone calls or WhatsApp threads.", ar: "يدير الموردون الطلبات ويردون على طلبات العروض دون مكالمات أو رسائل واتساب." } },
      { title: { en: "Performance scorecards", ar: "بطاقات أداء الموردين" }, body: { en: "On-time, in-full and price accuracy rates for every supplier.", ar: "نسب الالتزام بالوقت والكمية ودقة الأسعار لكل مورد." } },
    ],
    demo: { href: "/login", label: { en: "Try it as Saad, supplier", ar: "جرّبه كسعد، المورد" } },
  },
  {
    slug: "reporting",
    icon: "◔",
    title: { en: "Reporting and AI insights", ar: "التقارير والرؤى الذكية" },
    short: {
      en: "Food cost, COGS, variance, menu engineering and supplier performance across every branch, with ranked insights.",
      ar: "تكلفة الطعام وتكلفة المبيعات والفروقات وهندسة القائمة وأداء الموردين لكل الفروع، مع رؤى مرتبة.",
    },
    hero: { en: "Decide today, not at the end of the quarter", ar: "قرّر اليوم، لا في نهاية الربع" },
    points: [
      { title: { en: "Theoretical vs actual food cost", ar: "تكلفة الطعام النظرية والفعلية" }, body: { en: "See the gap between what recipes cost and what you really spent, per branch.", ar: "شاهد الفرق بين تكلفة الوصفات وما أنفقته فعلاً لكل فرع." } },
      { title: { en: "Menu engineering", ar: "هندسة القائمة" }, body: { en: "Stars, plowhorses, puzzles and dogs, so you know what to promote, reprice or drop.", ar: "النجوم وأحصنة العمل والألغاز والضعيفة، لتعرف ما تروّج له أو تعيد تسعيره أو تحذفه." } },
      { title: { en: "Ranked insights", ar: "رؤى مرتبة" }, body: { en: "Variance spikes, supplier price rises and stockout risks ranked by money at stake.", ar: "ارتفاع الفروقات وزيادات أسعار الموردين ومخاطر النفاد مرتبة حسب المبلغ المعرض للخطر." } },
      { title: { en: "Multi-branch control", ar: "تحكم متعدد الفروع" }, body: { en: "Compare branches side by side and drill into any item or supplier.", ar: "قارن الفروع جنباً إلى جنب وتعمق في أي صنف أو مورد." } },
    ],
    demo: { href: "/login", label: { en: "Try it as Faisal, owner", ar: "جرّبه كفيصل، المالك" } },
  },
];

export const SEGMENTS: { key: string; title: L; points: L[] }[] = [
  {
    key: "fine",
    title: { en: "Fine & casual dining", ar: "المطاعم الراقية والعائلية" },
    points: [
      { en: "High-value item tracking for meat and seafood", ar: "تتبع الأصناف عالية القيمة كاللحوم والمأكولات البحرية" },
      { en: "Recipe costing with live margins", ar: "تكلفة الوصفات مع هوامش محدثة" },
      { en: "Approval workflows for large orders", ar: "مسارات موافقة للطلبات الكبيرة" },
    ],
  },
  {
    key: "qsr",
    title: { en: "Quick service restaurants", ar: "مطاعم الوجبات السريعة" },
    points: [
      { en: "Fast POS-driven stock deduction", ar: "خصم سريع للمخزون من نقاط البيع" },
      { en: "Standard recipes across every branch", ar: "وصفات موحدة في كل الفروع" },
      { en: "Automated reorders on fast movers", ar: "طلب تلقائي للأصناف سريعة الحركة" },
    ],
  },
  {
    key: "cafes",
    title: { en: "Cafés & roasteries", ar: "المقاهي والمحامص" },
    points: [
      { en: "Cost every drink to the gram of coffee", ar: "احسب تكلفة كل مشروب حتى غرام القهوة" },
      { en: "Track milk and pastry waste", ar: "تتبع هدر الحليب والمخبوزات" },
      { en: "Compare roasters and dairy suppliers", ar: "قارن المحامص وموردي الألبان" },
    ],
  },
  {
    key: "cloud",
    title: { en: "Cloud kitchens", ar: "المطابخ السحابية" },
    points: [
      { en: "Many brands, one shared store", ar: "علامات متعددة ومخزن واحد" },
      { en: "Menu engineering per brand", ar: "هندسة القائمة لكل علامة" },
      { en: "Lean par levels to free cash", ar: "حدود مخزون مرنة لتحرير السيولة" },
    ],
  },
  {
    key: "catering",
    title: { en: "Catering", ar: "خدمات التموين" },
    points: [
      { en: "Event-sized RFQs to several suppliers", ar: "طلبات عروض بحجم المناسبات لعدة موردين" },
      { en: "Production and waste tracking", ar: "تتبع الإنتاج والهدر" },
      { en: "Cost per cover reporting", ar: "تقارير التكلفة لكل ضيف" },
    ],
  },
  {
    key: "hotels",
    title: { en: "Hotel restaurants", ar: "مطاعم الفنادق" },
    points: [
      { en: "Multiple outlets and cost centres", ar: "منافذ ومراكز تكلفة متعددة" },
      { en: "Role and location permissions", ar: "صلاحيات حسب الدور والموقع" },
      { en: "Full audit trail for finance", ar: "سجل تدقيق كامل للمالية" },
    ],
  },
];

export const FEATURES: { title: L; body: L }[] = [
  { title: { en: "Cloud based", ar: "سحابي" }, body: { en: "Nothing to install. Open it on any device.", ar: "لا شيء للتثبيت. افتحه من أي جهاز." } },
  { title: { en: "Role-based permissions", ar: "صلاحيات حسب الدور" }, body: { en: "Owners, managers, purchasing and suppliers each see what they need.", ar: "المالك والمدير والمشتريات والموردون، كلٌ يرى ما يحتاجه." } },
  { title: { en: "Arabic and English", ar: "عربي وإنجليزي" }, body: { en: "Full right-to-left Arabic interface, switch with one click.", ar: "واجهة عربية كاملة من اليمين لليسار، بدّل بنقرة." } },
  { title: { en: "Full status tracking", ar: "تتبع كامل للحالات" }, body: { en: "Every order and count has a timeline of who did what and when.", ar: "كل طلب وجرد له سجل زمني بمن فعل ماذا ومتى." } },
  { title: { en: "Nutrition and allergens", ar: "التغذية ومسببات الحساسية" }, body: { en: "Calories and allergens roll up from ingredients to menu items.", ar: "السعرات ومسببات الحساسية تُحسب من المكونات إلى الأطباق." } },
  { title: { en: "Open API", ar: "واجهة برمجية مفتوحة" }, body: { en: "Connect your POS, ERP or accounting system over REST.", ar: "اربط نقاط البيع أو نظام ERP أو المحاسبة عبر REST." } },
  { title: { en: "Instant insights", ar: "رؤى فورية" }, body: { en: "Numbers update the moment sales, deliveries and counts are posted.", ar: "الأرقام تتحدث لحظة ترحيل المبيعات والاستلام والجرد." } },
  { title: { en: "Multi-branch", ar: "متعدد الفروع" }, body: { en: "Manage every branch and brand from one account.", ar: "أدر كل الفروع والعلامات من حساب واحد." } },
];

export const FAQS: { q: L; a: L }[] = [
  {
    q: { en: "What is Wateen-MVP?", ar: "ما هو وتين؟" },
    a: {
      en: "A back-of-house platform for restaurants, cafés, cloud kitchens, caterers and hotel restaurants. It covers inventory, recipe costing, purchasing, a supplier marketplace and reporting.",
      ar: "منصة إدارة خلفية للمطاعم والمقاهي والمطابخ السحابية وخدمات التموين ومطاعم الفنادق. تغطي المخزون وتكلفة الوصفات والمشتريات وسوق الموردين والتقارير.",
    },
  },
  {
    q: { en: "How does it cut my food cost?", ar: "كيف يخفض تكلفة الطعام لدي؟" },
    a: {
      en: "It compares what your recipes say you should have used with what your stock counts show, so you find waste, over-portioning and theft. Smart reorders stop over-buying and receiving checks catch supplier price creep.",
      ar: "يقارن ما يجب أن تستهلكه حسب الوصفات مع ما يظهره الجرد، فتكتشف الهدر والحصص الزائدة والسرقة. الطلب الذكي يمنع الشراء الزائد وفحص الاستلام يكشف ارتفاع أسعار الموردين.",
    },
  },
  {
    q: { en: "Can I connect my POS system?", ar: "هل يمكنني ربط نظام نقاط البيع؟" },
    a: {
      en: "Yes. Sales can be imported from a POS export or pushed through the REST API. Each sale deducts recipe ingredients from stock automatically.",
      ar: "نعم. يمكن استيراد المبيعات من ملف نقاط البيع أو إرسالها عبر الواجهة البرمجية. كل عملية بيع تخصم مكونات الوصفة من المخزون تلقائياً.",
    },
  },
  {
    q: { en: "Can I manage several branches?", ar: "هل يمكنني إدارة عدة فروع؟" },
    a: {
      en: "Yes. Owners and purchasing see every branch; branch managers see only their own. Stock can be transferred between branches.",
      ar: "نعم. المالك والمشتريات يرون كل الفروع، ومدير الفرع يرى فرعه فقط. ويمكن تحويل المخزون بين الفروع.",
    },
  },
  {
    q: { en: "How do suppliers join?", ar: "كيف ينضم الموردون؟" },
    a: {
      en: "Suppliers get their own portal to manage their catalogue and prices, confirm and ship orders, and answer RFQs. There is no cost for suppliers to join.",
      ar: "يحصل الموردون على بوابة خاصة لإدارة الكتالوج والأسعار وتأكيد الطلبات وشحنها والرد على طلبات العروض، والانضمام مجاني للموردين.",
    },
  },
  {
    q: { en: "How long does setup take and what does it cost?", ar: "كم يستغرق الإعداد وما التكلفة؟" },
    a: {
      en: "Setup usually takes a few days: we load your items, recipes and suppliers. Pricing is per branch, monthly or yearly. See the pricing page.",
      ar: "يستغرق الإعداد عادة أياماً قليلة: نُدخل أصنافك ووصفاتك ومورديك. التسعير لكل فرع شهرياً أو سنوياً. راجع صفحة الأسعار.",
    },
  },
  {
    q: { en: "Is there a mobile app?", ar: "هل يوجد تطبيق جوال؟" },
    a: {
      en: "The platform is fully responsive, so counts, receiving and approvals work on a phone or tablet in the kitchen.",
      ar: "المنصة متجاوبة بالكامل، فيمكن إجراء الجرد والاستلام والموافقات من الجوال أو الجهاز اللوحي في المطبخ.",
    },
  },
];

export const PLANS = [
  {
    key: "starter",
    name: { en: "Starter", ar: "الأساسية" },
    monthly: 499,
    blurb: { en: "Inventory and recipe costing for a single concept.", ar: "المخزون وتكلفة الوصفات لمفهوم واحد." },
    features: [
      { en: "Inventory, waste and transfers", ar: "المخزون والهدر والتحويلات" },
      { en: "Stock counts and variance", ar: "الجرد والفروقات" },
      { en: "Digital cookbook and plate costing", ar: "كتاب وصفات رقمي وتكلفة الأطباق" },
      { en: "POS sales import", ar: "استيراد مبيعات نقاط البيع" },
    ],
  },
  {
    key: "growth",
    name: { en: "Growth", ar: "النمو" },
    monthly: 899,
    popular: true,
    blurb: { en: "The full back-of-house platform for growing groups.", ar: "منصة الإدارة الخلفية الكاملة للمجموعات النامية." },
    features: [
      { en: "Everything in Starter", ar: "كل ما في الأساسية" },
      { en: "Smart reorders and approvals", ar: "الطلب الذكي والموافقات" },
      { en: "Supplier marketplace and RFQs", ar: "سوق الموردين وطلبات العروض" },
      { en: "Reports and AI insights", ar: "التقارير والرؤى الذكية" },
    ],
  },
  {
    key: "enterprise",
    name: { en: "Enterprise", ar: "المؤسسات" },
    monthly: null,
    blurb: { en: "Multi-brand groups, hotels and central kitchens.", ar: "المجموعات متعددة العلامات والفنادق والمطابخ المركزية." },
    features: [
      { en: "Everything in Growth", ar: "كل ما في النمو" },
      { en: "POS, ERP and accounting integrations", ar: "تكامل مع نقاط البيع وERP والمحاسبة" },
      { en: "Custom approval chains", ar: "سلاسل موافقة مخصصة" },
      { en: "Dedicated success manager", ar: "مدير نجاح مخصص" },
    ],
  },
] as const;
