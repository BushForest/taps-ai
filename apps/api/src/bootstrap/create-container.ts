import type {
  AllocationPlan,
  CheckSnapshot,
  DiningSession,
  LoyaltyProfile,
  PaymentAttempt,
  Payer
} from "@taps/contracts";
import { createDbClient, type TapsDbClient } from "@taps/db";
import { isPendingPaymentStatus } from "@taps/domain";
import {
  createMemoryLoyaltyProvider,
  createMemoryNfcProvider,
  createMemoryPosProvider,
  createMockPaymentProvider,
  createProviderRegistry,
  createSquarePosProvider,
  createStripeCompatiblePaymentProvider,
  createToastPosPlaceholder
} from "@taps/mcp";
import { AllocationEngine } from "../modules/splits/allocation-engine";
import { SplitPaymentAgent } from "../modules/splits/split-payment-agent";
import { CheckAgent } from "../modules/checks/check-agent";
import { InMemoryDomainEventBus } from "../modules/events/domain-event-bus";
import { BullMqJobDispatcher, InMemoryJobDispatcher } from "../modules/jobs/job-dispatcher";
import { createDrizzleRepositories } from "../infrastructure/persistence/drizzle-repositories";
import { LoyaltyAgent } from "../modules/loyalty/loyalty-agent";
import { MenuAgent } from "../modules/menu/menu-agent";
import { PaymentAgent } from "../modules/payments/payment-agent";
import { PosIntegrationAgent } from "../modules/pos/pos-integration-agent";
import type {
  AllocationPlanRepository,
  AuditLogRecord,
  AuditRepository,
  CheckRepository,
  LoyaltyProfileRepository,
  PaymentAttemptRepository,
  PayerRepository,
  ReconciliationExceptionRecord,
  ReconciliationExceptionRepository,
  SessionRepository
} from "../modules/repositories";
import { TableSessionAgent } from "../modules/sessions/session-agent";
import { AdminAgent } from "../modules/admin/admin-agent";

interface RestaurantConfig {
  id: string;
  posProviderKey: string;
  paymentProviderKey: string;
  loyaltyProviderKey: string;
  publicGraceMinutes: number;
  supportRetentionDays: number;
  tableCount: number;
}

export interface ContainerRuntimeOptions {
  posProviderMode?: "memory" | "square";
  paymentProviderMode?: "mock" | "stripe";
  queueDriver?: "memory" | "bullmq";
  dataStoreDriver?: "memory" | "postgres";
  databaseUrl?: string;
  redisUrl?: string;
  dbClient?: TapsDbClient;
  square?: {
    accessToken?: string;
    locationId?: string;
    environment?: "sandbox" | "production";
    webhookSignatureKey?: string;
  };
  stripe?: {
    secretKey?: string;
    publishableKey?: string;
    webhookSecret?: string;
    apiVersion?: string;
  };
}

class InMemorySessionRepository implements SessionRepository {
  constructor(private readonly records = new Map<string, DiningSession>()) {}

  async findByPublicToken(token: string): Promise<DiningSession | null> {
    return [...this.records.values()].find((session) => session.publicToken === token) ?? null;
  }

  async findActiveByTable(restaurantId: string, tableId: string): Promise<DiningSession | null> {
    return (
      [...this.records.values()].find(
        (session) =>
          session.restaurantId === restaurantId &&
          session.tableId === tableId &&
          ["active", "payment_in_progress", "partially_paid", "fully_paid"].includes(session.status)
      ) ?? null
    );
  }

  async findById(id: string): Promise<DiningSession | null> {
    return this.records.get(id) ?? null;
  }

  async listByRestaurant(restaurantId: string, status?: string): Promise<DiningSession[]> {
    return [...this.records.values()].filter(
      (session) => session.restaurantId === restaurantId && (!status || session.status === status)
    );
  }

  async save(session: DiningSession): Promise<DiningSession> {
    this.records.set(session.id, session);
    return session;
  }

  async listExpirable(nowIso: string): Promise<DiningSession[]> {
    return [...this.records.values()].filter(
      (session) =>
        session.status === "closed" &&
        Boolean(session.publicExpiresAt) &&
        Date.parse(session.publicExpiresAt!) <= Date.parse(nowIso)
    );
  }

  async listArchivable(nowIso: string): Promise<DiningSession[]> {
    return [...this.records.values()].filter(
      (session) =>
        ["public_expired", "cleared_locked"].includes(session.status) &&
        Boolean(session.auditExpiresAt) &&
        Date.parse(session.auditExpiresAt!) <= Date.parse(nowIso)
    );
  }
}

class InMemoryCheckRepository implements CheckRepository {
  constructor(private readonly records = new Map<string, CheckSnapshot>()) {}

  async findLatestBySession(sessionId: string): Promise<CheckSnapshot | null> {
    return (
      [...this.records.values()]
        .filter((snapshot) => snapshot.sessionId === sessionId)
        .sort((left, right) => right.version - left.version)[0] ?? null
    );
  }

  async save(snapshot: CheckSnapshot): Promise<CheckSnapshot> {
    this.records.set(snapshot.id, snapshot);
    return snapshot;
  }
}

class InMemoryAllocationPlanRepository implements AllocationPlanRepository {
  constructor(private readonly records = new Map<string, AllocationPlan>()) {}

  async findById(id: string): Promise<AllocationPlan | null> {
    return this.records.get(id) ?? null;
  }

  async findLatestByCheck(checkSnapshotId: string): Promise<AllocationPlan | null> {
    return (
      [...this.records.values()]
        .filter((plan) => plan.checkSnapshotId === checkSnapshotId)
        .sort((left, right) => right.checkVersion - left.checkVersion || right.version - left.version)[0] ?? null
    );
  }

  async findLatestBySession(sessionId: string): Promise<AllocationPlan | null> {
    return (
      [...this.records.values()]
        .filter((plan) => plan.sessionId === sessionId)
        .sort((left, right) => right.checkVersion - left.checkVersion || right.version - left.version)[0] ?? null
    );
  }

  async save(plan: AllocationPlan): Promise<AllocationPlan> {
    this.records.set(plan.id, plan);
    return plan;
  }
}

class InMemoryPayerRepository implements PayerRepository {
  constructor(private readonly records = new Map<string, Payer>()) {}

  async listBySession(sessionId: string): Promise<Payer[]> {
    return [...this.records.values()].filter((payer) => payer.sessionId === sessionId);
  }

  async findById(id: string): Promise<Payer | null> {
    return this.records.get(id) ?? null;
  }

  async save(payer: Payer): Promise<Payer> {
    this.records.set(payer.id, payer);
    return payer;
  }
}

class InMemoryPaymentAttemptRepository implements PaymentAttemptRepository {
  constructor(private readonly records = new Map<string, PaymentAttempt>()) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentAttempt | null> {
    return [...this.records.values()].find((payment) => payment.idempotencyKey === idempotencyKey) ?? null;
  }

  async findById(id: string): Promise<PaymentAttempt | null> {
    return this.records.get(id) ?? null;
  }

  async findByProviderPaymentIntentId(provider: string, providerPaymentIntentId: string): Promise<PaymentAttempt | null> {
    return (
      [...this.records.values()].find(
        (payment) =>
          payment.provider === provider && payment.providerPaymentIntentId === providerPaymentIntentId
      ) ?? null
    );
  }

  async listBySession(sessionId: string): Promise<PaymentAttempt[]> {
    return [...this.records.values()].filter((payment) => payment.sessionId === sessionId);
  }

  async listPendingBySession(sessionId: string): Promise<PaymentAttempt[]> {
    return [...this.records.values()].filter(
      (payment) => payment.sessionId === sessionId && isPendingPaymentStatus(payment.status)
    );
  }

  async save(paymentAttempt: PaymentAttempt): Promise<PaymentAttempt> {
    this.records.set(paymentAttempt.id, paymentAttempt);
    return paymentAttempt;
  }
}

class InMemoryLoyaltyProfileRepository implements LoyaltyProfileRepository {
  constructor(private readonly records = new Map<string, LoyaltyProfile>()) {}

  async findById(id: string): Promise<LoyaltyProfile | null> {
    return this.records.get(id) ?? null;
  }

  async findByPhone(restaurantId: string, phoneE164: string): Promise<LoyaltyProfile | null> {
    return (
      [...this.records.values()].find(
        (profile) => profile.restaurantId === restaurantId && profile.phoneE164 === phoneE164
      ) ?? null
    );
  }

  async save(profile: LoyaltyProfile): Promise<LoyaltyProfile> {
    this.records.set(profile.id, profile);
    return profile;
  }
}

class InMemoryReconciliationExceptionRepository implements ReconciliationExceptionRepository {
  readonly records: Map<string, ReconciliationExceptionRecord>;

  constructor(seedRecords = new Map<string, ReconciliationExceptionRecord>()) {
    this.records = seedRecords;
  }

  async create(exception: ReconciliationExceptionRecord): Promise<ReconciliationExceptionRecord> {
    this.records.set(exception.id, exception);
    return exception;
  }

  async listOpenBySession(sessionId: string): Promise<ReconciliationExceptionRecord[]> {
    return [...this.records.values()].filter((record) => record.sessionId === sessionId && record.status === "open");
  }

  async resolve(id: string, resolvedAt: string): Promise<void> {
    const current = this.records.get(id);
    if (!current) {
      return;
    }

    this.records.set(id, {
      ...current,
      status: "resolved",
      resolvedAt
    });
  }
}

class InMemoryAuditRepository implements AuditRepository {
  readonly records: AuditLogRecord[] = [];

  async record(entry: AuditLogRecord): Promise<void> {
    this.records.push(entry);
  }
}

function buildDemoMenu() {
  return {
    id: "menu_blackblue_v1",
    restaurantId: "rest_demo",
    source: "mirror" as const,
    sourceVersion: "v1",
    currency: "USD" as const,
    categories: [
      { id: "cat_steaks", name: "Steaks & Mains", sortOrder: 1 },
      { id: "cat_starters", name: "Starters & Sides", sortOrder: 2 },
      { id: "cat_cocktails", name: "Cocktails & Drinks", sortOrder: 3 },
      { id: "cat_desserts", name: "Desserts", sortOrder: 4 }
    ],
    items: [
      // Steaks & Mains
      {
        id: "item_ny_strip",
        categoryId: "cat_steaks",
        name: "Prime New York Strip 12oz",
        description: "USDA prime dry-aged New York strip, served with bone marrow butter.",
        basePriceCents: 6200,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_filet",
        categoryId: "cat_steaks",
        name: "Filet Mignon 8oz",
        description: "Centre-cut tenderloin, the most tender cut on the menu.",
        basePriceCents: 7200,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_ribeye",
        categoryId: "cat_steaks",
        name: "Bone-In Ribeye 18oz",
        description: "Well-marbled bone-in ribeye, rich and bold.",
        basePriceCents: 8500,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_surf_turf",
        categoryId: "cat_steaks",
        name: "Surf & Turf",
        description: "Filet mignon paired with a butter-poached Atlantic lobster tail.",
        basePriceCents: 11000,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_salmon",
        categoryId: "cat_steaks",
        name: "Grilled Atlantic Salmon",
        description: "Pan-seared salmon fillet with lemon beurre blanc and micro herbs.",
        basePriceCents: 4200,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_ahi_tuna",
        categoryId: "cat_steaks",
        name: "Seared Ahi Tuna",
        description: "Sashimi-grade yellowfin tuna, sesame crust, ponzu, and pickled ginger.",
        basePriceCents: 3600,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_chicken",
        categoryId: "cat_steaks",
        name: "Roasted Chicken Supreme",
        description: "Free-range airline chicken breast, roasted jus, and seasonal vegetables.",
        basePriceCents: 3400,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      // Starters & Sides
      {
        id: "item_oysters",
        categoryId: "cat_starters",
        name: "Oysters on the Half Shell (6pc)",
        description: "Market oysters with mignonette, cocktail sauce, and fresh lemon.",
        basePriceCents: 2400,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_shrimp_cocktail",
        categoryId: "cat_starters",
        name: "Jumbo Shrimp Cocktail",
        description: "Chilled jumbo tiger shrimp with zesty house cocktail sauce.",
        basePriceCents: 2200,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_calamari",
        categoryId: "cat_starters",
        name: "Crispy Calamari",
        description: "Lightly dusted calamari rings, fried golden, with spicy aioli.",
        basePriceCents: 1800,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_french_onion",
        categoryId: "cat_starters",
        name: "French Onion Soup",
        description: "Classic slow-caramelized onion broth, gruyère crouton.",
        basePriceCents: 1600,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_caesar",
        categoryId: "cat_starters",
        name: "Caesar Salad",
        description: "Romaine hearts, house dressing, shaved parmesan, and garlic croutons.",
        basePriceCents: 1700,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_truffle_mac",
        categoryId: "cat_starters",
        name: "Truffle Mac & Cheese",
        description: "Cavatappi pasta in a three-cheese sauce with black truffle oil.",
        basePriceCents: 1900,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_lobster_mac",
        categoryId: "cat_starters",
        name: "Lobster Mac & Cheese",
        description: "Cavatappi pasta with Atlantic lobster and a rich lobster bisque sauce.",
        basePriceCents: 2600,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_brussels",
        categoryId: "cat_starters",
        name: "Crispy Brussels Sprouts",
        description: "Fried Brussels sprouts with candied bacon, balsamic glaze, and parmesan.",
        basePriceCents: 1500,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_bone_marrow",
        categoryId: "cat_starters",
        name: "Bone Marrow",
        description: "Roasted bone marrow with toasted sourdough, sea salt, and gremolata.",
        basePriceCents: 2100,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      // Cocktails & Drinks
      {
        id: "item_old_fashioned",
        categoryId: "cat_cocktails",
        name: "Old Fashioned",
        description: "Bourbon, Angostura bitters, demerara sugar, and an orange peel.",
        basePriceCents: 1800,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_espresso_martini",
        categoryId: "cat_cocktails",
        name: "Espresso Martini",
        description: "Vodka, cold brew espresso, Kahlúa, and a salted rim.",
        basePriceCents: 1900,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_aperol_spritz",
        categoryId: "cat_cocktails",
        name: "Aperol Spritz",
        description: "Aperol, Prosecco, and a splash of soda with an orange slice.",
        basePriceCents: 1700,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_paloma",
        categoryId: "cat_cocktails",
        name: "Paloma",
        description: "Blanco tequila, fresh grapefruit juice, lime, and a salted rim.",
        basePriceCents: 1700,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_craft_beer",
        categoryId: "cat_cocktails",
        name: "Craft Beer",
        description: "Rotating selection of local Ontario craft beers.",
        basePriceCents: 1000,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_house_wine",
        categoryId: "cat_cocktails",
        name: "House Wine (Glass)",
        description: "Chef's selection of red, white, or rosé.",
        basePriceCents: 1600,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_whiskey",
        categoryId: "cat_cocktails",
        name: "Premium Whiskey (2oz)",
        description: "Selection of premium single malts and blended Scotch whiskies.",
        basePriceCents: 2200,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      // Desserts
      {
        id: "item_lava_cake",
        categoryId: "cat_desserts",
        name: "Warm Chocolate Lava Cake",
        description: "Molten dark chocolate centre with vanilla bean ice cream.",
        basePriceCents: 1400,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_cheesecake",
        categoryId: "cat_desserts",
        name: "New York Cheesecake",
        description: "Classic dense cheesecake with seasonal fruit compote.",
        basePriceCents: 1200,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_creme_brulee",
        categoryId: "cat_desserts",
        name: "Crème Brûlée",
        description: "Silky vanilla custard with a caramelized sugar crust.",
        basePriceCents: 1300,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      },
      {
        id: "item_sorbet",
        categoryId: "cat_desserts",
        name: "Seasonal Sorbet",
        description: "House-made sorbet using fresh seasonal fruit.",
        basePriceCents: 1000,
        currency: "USD" as const,
        availability: "available" as const,
        modifiers: [],
        addOns: []
      }
    ],
    fetchedAt: new Date().toISOString(),
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function makeLine(
  id: string,
  name: string,
  unitPriceCents: number,
  quantity = 1,
  status: "open" | "sent" = "open"
): import("@taps/contracts").CheckLineItem {
  const ext = unitPriceCents * quantity;
  const tax = Math.round(ext * 0.13);
  return {
    id,
    posLineId: `pos_${id}`,
    kind: "item",
    name,
    quantity,
    unitPriceCents,
    extendedPriceCents: ext,
    status,
    isStandalone: true,
    isModifier: false,
    taxCents: tax,
    feeCents: 0,
    grossCents: ext + tax,
    assignedCents: 0,
    childLineIds: [],
    assignmentStatus: "unassigned",
    isTinyCharge: false
  };
}

function buildCheck(
  tableId: string,
  lines: import("@taps/contracts").CheckLineItem[],
  amountPaidCents = 0
): CheckSnapshot {
  const subtotalCents = lines.reduce((s, l) => s + l.extendedPriceCents, 0);
  const taxCents = lines.reduce((s, l) => s + (l.taxCents ?? 0), 0);
  const totalCents = subtotalCents + taxCents;
  const remainingBalanceCents = Math.max(totalCents - amountPaidCents, 0);
  const lineIds = lines.map((l) => l.id);
  const now = new Date().toISOString();
  return {
    id: `check_seed_${tableId}`,
    restaurantId: "rest_demo",
    sessionId: "session_placeholder",
    posCheckId: `pos_check_${tableId}`,
    sourceSystem: "memory_pos",
    sourceCheckVersion: "1",
    status: remainingBalanceCents === 0 ? "closed" : amountPaidCents > 0 ? "partially_paid" : "open",
    currency: "USD",
    subtotalCents,
    taxCents,
    feeCents: 0,
    discountCents: 0,
    totalCents,
    amountPaidCents,
    remainingBalanceCents,
    assignmentSummary: {
      completeness: "unassigned",
      assignedLineCents: 0,
      unassignedLineCents: remainingBalanceCents,
      outstandingBalanceCents: remainingBalanceCents,
      unassignedLineItemIds: lineIds,
      unassignedTinyItemIds: []
    },
    sourceUpdatedAt: now,
    version: 1,
    createdAt: now,
    updatedAt: now,
    lines
  };
}

function buildAllTableChecks(): Record<string, CheckSnapshot> {
  // Tables 1-3: EMPTY — no check seeded
  // Tables 4-6: JUST SEATED — drinks sent to bar, in kitchen
  const table4 = buildCheck("table_4", [
    makeLine("t4_l1", "Old Fashioned", 1800, 1, "sent"),
    makeLine("t4_l2", "Aperol Spritz", 1700, 1, "sent"),
    makeLine("t4_l3", "Craft Beer", 1000, 1, "sent")
  ]);
  const table5 = buildCheck("table_5", [
    makeLine("t5_l1", "Espresso Martini", 1900, 1, "sent"),
    makeLine("t5_l2", "House Wine (Glass)", 1600, 1, "sent"),
    makeLine("t5_l3", "Paloma", 1700, 1, "sent")
  ]);
  const table6 = buildCheck("table_6", [
    makeLine("t6_l1", "Old Fashioned", 1800, 1, "sent"),
    makeLine("t6_l2", "Premium Whiskey (2oz)", 2200, 1, "sent")
  ]);

  // Tables 7-9: EATING — mains on the table, desserts still in kitchen
  const table7 = buildCheck("table_7", [
    makeLine("t7_l1", "Oysters on the Half Shell (6pc)", 2400),
    makeLine("t7_l2", "Caesar Salad", 1700),
    makeLine("t7_l3", "Prime New York Strip 12oz", 6200),
    makeLine("t7_l4", "Filet Mignon 8oz", 7200),
    makeLine("t7_l5", "Truffle Mac & Cheese", 1900),
    makeLine("t7_l6", "Crispy Brussels Sprouts", 1500),
    makeLine("t7_l7", "Old Fashioned", 1800),
    makeLine("t7_l8", "House Wine (Glass)", 1600),
    makeLine("t7_l9", "Warm Chocolate Lava Cake", 1400, 1, "sent"),
    makeLine("t7_l10", "Crème Brûlée", 1300, 1, "sent")
  ]);
  const table8 = buildCheck("table_8", [
    makeLine("t8_l1", "Bone Marrow", 2100),
    makeLine("t8_l2", "Jumbo Shrimp Cocktail", 2200),
    makeLine("t8_l3", "French Onion Soup", 1600),
    makeLine("t8_l4", "Bone-In Ribeye 18oz", 8500),
    makeLine("t8_l5", "Grilled Atlantic Salmon", 4200),
    makeLine("t8_l6", "Lobster Mac & Cheese", 2600),
    makeLine("t8_l7", "Aperol Spritz", 1700),
    makeLine("t8_l8", "Espresso Martini", 1900),
    makeLine("t8_l9", "Craft Beer", 1000),
    makeLine("t8_l10", "New York Cheesecake", 1200, 1, "sent")
  ]);
  const table9 = buildCheck("table_9", [
    makeLine("t9_l1", "Crispy Calamari", 1800),
    makeLine("t9_l2", "Caesar Salad", 1700),
    makeLine("t9_l3", "Surf & Turf", 11000),
    makeLine("t9_l4", "Seared Ahi Tuna", 3600),
    makeLine("t9_l5", "Roasted Chicken Supreme", 3400),
    makeLine("t9_l6", "Truffle Mac & Cheese", 1900),
    makeLine("t9_l7", "Old Fashioned", 1800),
    makeLine("t9_l8", "Paloma", 1700),
    makeLine("t9_l9", "House Wine (Glass)", 1600, 2),
    makeLine("t9_l10", "Seasonal Sorbet", 1000, 1, "sent")
  ]);

  // Tables 10-12: ABOUT TO PAY — large bills, partially paid
  // table_10: $350+ bill, one payer has paid ~$120
  const table10Lines = [
    makeLine("t10_l1", "Oysters on the Half Shell (6pc)", 2400),
    makeLine("t10_l2", "Jumbo Shrimp Cocktail", 2200),
    makeLine("t10_l3", "Prime New York Strip 12oz", 6200),
    makeLine("t10_l4", "Filet Mignon 8oz", 7200),
    makeLine("t10_l5", "Bone-In Ribeye 18oz", 8500),
    makeLine("t10_l6", "Truffle Mac & Cheese", 1900),
    makeLine("t10_l7", "Crispy Brussels Sprouts", 1500),
    makeLine("t10_l8", "Old Fashioned", 1800),
    makeLine("t10_l9", "Espresso Martini", 1900),
    makeLine("t10_l10", "House Wine (Glass)", 1600, 2),
    makeLine("t10_l11", "Warm Chocolate Lava Cake", 1400),
    makeLine("t10_l12", "New York Cheesecake", 1200)
  ];
  const table10Total =
    table10Lines.reduce((s, l) => s + l.extendedPriceCents + (l.taxCents ?? 0), 0);
  const table10 = buildCheck("table_10", table10Lines, Math.round(table10Total * 0.33));

  // table_11: ~$480 bill, about half paid
  const table11Lines = [
    makeLine("t11_l1", "Bone Marrow", 2100),
    makeLine("t11_l2", "Oysters on the Half Shell (6pc)", 2400),
    makeLine("t11_l3", "Caesar Salad", 1700, 2),
    makeLine("t11_l4", "Surf & Turf", 11000),
    makeLine("t11_l5", "Bone-In Ribeye 18oz", 8500),
    makeLine("t11_l6", "Grilled Atlantic Salmon", 4200),
    makeLine("t11_l7", "Roasted Chicken Supreme", 3400),
    makeLine("t11_l8", "Lobster Mac & Cheese", 2600),
    makeLine("t11_l9", "Truffle Mac & Cheese", 1900),
    makeLine("t11_l10", "Premium Whiskey (2oz)", 2200, 2),
    makeLine("t11_l11", "Aperol Spritz", 1700, 2),
    makeLine("t11_l12", "Crème Brûlée", 1300),
    makeLine("t11_l13", "Warm Chocolate Lava Cake", 1400)
  ];
  const table11Total =
    table11Lines.reduce((s, l) => s + l.extendedPriceCents + (l.taxCents ?? 0), 0);
  const table11 = buildCheck("table_11", table11Lines, Math.round(table11Total * 0.50));

  // table_12: ~$320 bill, most paid, desserts just sent to kitchen
  const table12Lines = [
    makeLine("t12_l1", "Crispy Calamari", 1800),
    makeLine("t12_l2", "French Onion Soup", 1600),
    makeLine("t12_l3", "Prime New York Strip 12oz", 6200),
    makeLine("t12_l4", "Seared Ahi Tuna", 3600),
    makeLine("t12_l5", "Roasted Chicken Supreme", 3400),
    makeLine("t12_l6", "Crispy Brussels Sprouts", 1500),
    makeLine("t12_l7", "Old Fashioned", 1800),
    makeLine("t12_l8", "Paloma", 1700),
    makeLine("t12_l9", "House Wine (Glass)", 1600),
    makeLine("t12_l10", "New York Cheesecake", 1200, 1, "sent"),
    makeLine("t12_l11", "Seasonal Sorbet", 1000, 1, "sent")
  ];
  const table12Total =
    table12Lines.reduce((s, l) => s + l.extendedPriceCents + (l.taxCents ?? 0), 0);
  const table12 = buildCheck("table_12", table12Lines, Math.round(table12Total * 0.75));

  // test_table: simple 5400-total check (8% tax) for integration tests — no seeded session
  const testTableLines: import("@taps/contracts").CheckLineItem[] = [
    {
      id: "t_test_l1",
      posLineId: "pos_t_test_l1",
      kind: "item",
      name: "Smash Burger",
      quantity: 1,
      unitPriceCents: 1800,
      extendedPriceCents: 1800,
      status: "open",
      isStandalone: true,
      isModifier: false,
      taxCents: 144,
      feeCents: 0,
      grossCents: 1944,
      assignedCents: 0,
      childLineIds: [],
      assignmentStatus: "unassigned",
      isTinyCharge: false
    },
    {
      id: "t_test_l2",
      posLineId: "pos_t_test_l2",
      kind: "item",
      name: "Fries",
      quantity: 1,
      unitPriceCents: 700,
      extendedPriceCents: 700,
      status: "open",
      isStandalone: true,
      isModifier: false,
      taxCents: 56,
      feeCents: 0,
      grossCents: 756,
      assignedCents: 0,
      childLineIds: [],
      assignmentStatus: "unassigned",
      isTinyCharge: false
    },
    {
      id: "t_test_l3",
      posLineId: "pos_t_test_l3",
      kind: "item",
      name: "House Margarita Pitcher",
      quantity: 1,
      unitPriceCents: 2200,
      extendedPriceCents: 2200,
      status: "open",
      isStandalone: true,
      isModifier: false,
      taxCents: 176,
      feeCents: 0,
      grossCents: 2376,
      assignedCents: 0,
      childLineIds: [],
      assignmentStatus: "unassigned",
      isTinyCharge: false
    },
    {
      id: "t_test_l4",
      posLineId: "pos_t_test_l4",
      kind: "item",
      name: "Chipotle Mayo",
      quantity: 1,
      unitPriceCents: 150,
      extendedPriceCents: 150,
      status: "open",
      isStandalone: true,
      isModifier: false,
      taxCents: 12,
      feeCents: 0,
      grossCents: 162,
      assignedCents: 0,
      childLineIds: [],
      assignmentStatus: "unassigned",
      isTinyCharge: true
    },
    {
      id: "t_test_l5",
      posLineId: "pos_t_test_l5",
      kind: "item",
      name: "Craft Beer",
      quantity: 1,
      unitPriceCents: 150,
      extendedPriceCents: 150,
      status: "open",
      isStandalone: true,
      isModifier: false,
      taxCents: 12,
      feeCents: 0,
      grossCents: 162,
      assignedCents: 0,
      childLineIds: [],
      assignmentStatus: "unassigned",
      isTinyCharge: true
    }
  ];
  // subtotal = 1800+700+2200+150+150 = 5000, tax = 144+56+176+12+12 = 400, total = 5400
  const testTable = buildCheck("test_table", testTableLines);

  return {
    table_4: table4,
    table_5: table5,
    table_6: table6,
    table_7: table7,
    table_8: table8,
    table_9: table9,
    table_10: table10,
    table_11: table11,
    table_12: table12,
    test_table: testTable
  };
}

type SeedMaps = {
  sessions: Map<string, DiningSession>;
  checks: Map<string, CheckSnapshot>;
  payers: Map<string, Payer>;
  exceptions: Map<string, ReconciliationExceptionRecord>;
};

function buildSeedMaps(restaurantId: string): SeedMaps {
  const now = new Date().toISOString();
  const tableChecks = buildAllTableChecks();
  const sessions = new Map<string, DiningSession>();
  const checks = new Map<string, CheckSnapshot>();
  const payers = new Map<string, Payer>();
  const exceptions = new Map<string, ReconciliationExceptionRecord>();

  const tableStates: Array<{ tableId: string; status: DiningSession["status"] }> = [
    { tableId: "table_4", status: "active" },
    { tableId: "table_5", status: "active" },
    { tableId: "table_6", status: "active" },
    { tableId: "table_7", status: "active" },
    { tableId: "table_8", status: "active" },
    { tableId: "table_9", status: "active" },
    { tableId: "table_10", status: "partially_paid" },
    { tableId: "table_11", status: "partially_paid" },
    { tableId: "table_12", status: "partially_paid" }
  ];

  for (const { tableId, status } of tableStates) {
    const sessionId = `sess_seed_${tableId}`;
    const checkId = `check_seed_${tableId}`;
    const rawCheck = tableChecks[tableId];
    if (rawCheck) {
      checks.set(checkId, { ...rawCheck, sessionId });
    }
    sessions.set(sessionId, {
      id: sessionId,
      restaurantId,
      tableId,
      nfcTagId: `tag_${tableId}`,
      publicToken: `pub_demo_${tableId}`,
      status,
      openedAt: now,
      currentCheckId: checkId,
      version: 1,
      createdAt: now,
      updatedAt: now
    });
  }

  // Seed payers for tables 4-6 (just seated — drinks only)
  const payerDefs: Array<{ tableId: string; names: string[] }> = [
    { tableId: "table_4", names: ["Alex", "Jordan"] },
    { tableId: "table_5", names: ["Sam", "Riley", "Taylor"] },
    { tableId: "table_6", names: ["Morgan", "Casey"] },
    { tableId: "table_7", names: ["Sarah", "Mike", "Emma"] },
    { tableId: "table_8", names: ["Chris", "Dana"] },
    { tableId: "table_9", names: ["Guest 1", "Guest 2", "Guest 3", "Guest 4"] },
    { tableId: "table_10", names: ["Olivia", "Noah", "Ava"] },
    { tableId: "table_11", names: ["Liam", "Emma"] },
    { tableId: "table_12", names: ["Jake", "Mia", "Tyler", "Zoe"] }
  ];

  for (const { tableId, names } of payerDefs) {
    const sessionId = `sess_seed_${tableId}`;
    names.forEach((name, idx) => {
      const payerId = `payer_seed_${tableId}_${idx + 1}`;
      payers.set(payerId, {
        id: payerId,
        sessionId,
        displayName: name,
        status: "active"
      });
    });
  }

  // Seed exceptions
  const minus15min = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const minus5min = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const exc1: ReconciliationExceptionRecord = {
    id: "exc_seed_1",
    restaurantId,
    sessionId: "sess_seed_table_8",
    type: "pos_sync_failure",
    severity: "warning",
    status: "open",
    summary: "POS check sync failed — connection timeout",
    detectedAt: minus15min
  };
  const exc2: ReconciliationExceptionRecord = {
    id: "exc_seed_2",
    restaurantId,
    sessionId: "sess_seed_table_11",
    type: "payment_capture_delayed",
    severity: "warning",
    status: "open",
    summary: "Payment capture took longer than expected",
    detectedAt: minus5min
  };
  exceptions.set(exc1.id, exc1);
  exceptions.set(exc2.id, exc2);

  return { sessions, checks, payers, exceptions };
}

export function createContainer(runtime: ContainerRuntimeOptions = {}) {
  const restaurantConfig: RestaurantConfig = {
    id: "rest_demo",
    posProviderKey: runtime.posProviderMode === "square" ? "square" : "memory",
    paymentProviderKey: runtime.paymentProviderMode === "stripe" ? "stripe" : "mock",
    loyaltyProviderKey: "memory",
    publicGraceMinutes: 15,
    supportRetentionDays: 30,
    tableCount: 12
  };

  const restaurantInfo = {
    name: "Black+Blue Toronto",
    description:
      "An upscale urban steakhouse serving prime cuts, fresh seafood, and handcrafted cocktails in the heart of the Financial District.",
    location: "130 King St W, Toronto, ON M5X 1E5",
    phone: "(416) 593-2583",
    hours: "Mon–Fri 11:30am–10pm, Sat–Sun 5pm–10pm",
    tableCount: 12
  };

  const providers = createProviderRegistry();
  const nfcTagMap: Record<string, { restaurantId: string; tableId: string; nfcTagId: string }> = {};
  for (let i = 1; i <= restaurantInfo.tableCount; i++) {
    const tableId = `table_${i}`;
    nfcTagMap[`demo-table-${i}`] = {
      restaurantId: restaurantConfig.id,
      tableId,
      nfcTagId: `tag_${tableId}`
    };
  }
  // Test-only table: fresh check (5400 total), no seeded session — used by integration tests
  nfcTagMap["demo-table-test"] = {
    restaurantId: restaurantConfig.id,
    tableId: "test_table",
    nfcTagId: "tag_test_table"
  };
  providers.nfc.default = createMemoryNfcProvider(nfcTagMap);
  providers.pos.memory = createMemoryPosProvider({
    menu: buildDemoMenu(),
    checksByTable: buildAllTableChecks(),
    menuToEmptyCheck(sessionId, restaurantId, tableId) {
      const now = new Date().toISOString();
      return {
        id: `check_${sessionId}`,
        sessionId,
        restaurantId,
        posCheckId: `pos_${tableId}_${sessionId}`,
        sourceSystem: "memory_pos",
        sourceCheckVersion: "1",
        status: "open" as const,
        currency: "USD" as const,
        subtotalCents: 0,
        taxCents: 0,
        feeCents: 0,
        discountCents: 0,
        totalCents: 0,
        amountPaidCents: 0,
        remainingBalanceCents: 0,
        assignmentSummary: {
          completeness: "unassigned" as const,
          assignedLineCents: 0,
          unassignedLineCents: 0,
          outstandingBalanceCents: 0,
          unassignedLineItemIds: [],
          unassignedTinyItemIds: []
        },
        sourceUpdatedAt: now,
        version: 1,
        createdAt: now,
        updatedAt: now,
        lines: []
      };
    }
  });
  providers.pos.square = createSquarePosProvider(runtime.square);
  providers.pos.toast = createToastPosPlaceholder();
  providers.payments.mock = createMockPaymentProvider();
  providers.payments.stripe = createStripeCompatiblePaymentProvider(runtime.stripe);
  providers.loyalty.memory = createMemoryLoyaltyProvider();

  const seed = buildSeedMaps(restaurantConfig.id);
  const repositories =
    runtime.dataStoreDriver === "postgres"
      ? createDrizzleRepositories(
          runtime.dbClient ??
            (runtime.databaseUrl
              ? createDbClient(runtime.databaseUrl)
              : (() => {
                  throw new Error("DATABASE_URL or dbClient is required when DATA_STORE_DRIVER=postgres.");
                })())
        )
      : {
          sessions: new InMemorySessionRepository(seed.sessions),
          checks: new InMemoryCheckRepository(seed.checks),
          plans: new InMemoryAllocationPlanRepository(),
          payers: new InMemoryPayerRepository(seed.payers),
          paymentAttempts: new InMemoryPaymentAttemptRepository(),
          loyaltyProfiles: new InMemoryLoyaltyProfileRepository(),
          exceptions: new InMemoryReconciliationExceptionRepository(seed.exceptions),
          audit: new InMemoryAuditRepository()
        };
  const events = new InMemoryDomainEventBus();
  const jobs =
    runtime.queueDriver === "bullmq"
      ? new BullMqJobDispatcher(
          runtime.redisUrl ??
            (() => {
              throw new Error("REDIS_URL is required when QUEUE_DRIVER=bullmq.");
            })()
        )
      : new InMemoryJobDispatcher();
  const posAgent = new PosIntegrationAgent(providers);
  const sessionAgent = new TableSessionAgent(repositories.sessions, repositories.audit, events, providers, posAgent, jobs);
  const menuAgent = new MenuAgent(posAgent, repositories.audit);
  const checkAgent = new CheckAgent(repositories.checks, repositories.audit, events, posAgent);
  const splitAgent = new SplitPaymentAgent(new AllocationEngine(), repositories.plans);
  const loyaltyAgent = new LoyaltyAgent(
    repositories.loyaltyProfiles,
    repositories.audit,
    providers,
    repositories.payers,
    repositories.paymentAttempts
  );
  const paymentAgent = new PaymentAgent(
    repositories.paymentAttempts,
    repositories.exceptions,
    repositories.audit,
    providers,
    posAgent,
    repositories.plans,
    repositories.payers,
    loyaltyAgent,
    jobs
  );
  const adminAgent = new AdminAgent(
    repositories.sessions,
    repositories.exceptions,
    repositories.audit,
    sessionAgent,
    repositories.checks,
    repositories.plans,
    repositories.payers,
    repositories.paymentAttempts,
    splitAgent,
    checkAgent,
    posAgent,
    {
      supportRetentionDays: restaurantConfig.supportRetentionDays
    }
  );

  const assistRequests = new Map<string, boolean>();
  const featureFlags = new Map<string, Record<string, boolean>>([
    ["rest_demo", {
      digital_menu: true,
      kitchen_ordering: true,
      split_payments: true,
      tipping: true,
      server_request: true,
      wallet_pay: false
    }]
  ]);

  return {
    restaurantConfig,
    restaurantInfo,
    providers,
    repositories,
    events,
    jobs,
    assistRequests,
    featureFlags,
    agents: {
      posAgent,
      sessionAgent,
      menuAgent,
      checkAgent,
      splitAgent,
      paymentAgent,
      loyaltyAgent,
      adminAgent
    }
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
