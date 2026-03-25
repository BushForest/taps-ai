import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";

const idColumn = (name: string) => varchar(name, { length: 255 });

export const restaurants = pgTable("restaurants", {
  id: idColumn("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  posProvider: varchar("pos_provider", { length: 64 }).notNull(),
  paymentProvider: varchar("payment_provider", { length: 64 }).notNull(),
  loyaltyMode: varchar("loyalty_mode", { length: 64 }).notNull().default("optional"),
  publicSessionGraceMinutes: integer("public_session_grace_minutes").notNull().default(15),
  supportRetentionDays: integer("support_retention_days").notNull().default(30),
  configurationVersion: integer("configuration_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const physicalTables = pgTable(
  "physical_tables",
  {
    id: idColumn("id").primaryKey(),
    restaurantId: idColumn("restaurant_id").notNull().references(() => restaurants.id),
    tableCode: varchar("table_code", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    serviceArea: varchar("service_area", { length: 128 }),
    activeSessionId: idColumn("active_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    restaurantTableCodeIdx: uniqueIndex("physical_tables_restaurant_table_code_uq").on(table.restaurantId, table.tableCode)
  })
);

export const nfcTags = pgTable(
  "nfc_tags",
  {
    id: idColumn("id").primaryKey(),
    restaurantId: idColumn("restaurant_id").notNull().references(() => restaurants.id),
    tableId: idColumn("table_id").notNull().references(() => physicalTables.id),
    tagCode: varchar("tag_code", { length: 128 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    lastTappedAt: timestamp("last_tapped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    restaurantTagCodeIdx: uniqueIndex("nfc_tags_restaurant_tag_code_uq").on(table.restaurantId, table.tagCode)
  })
);

export const diningSessions = pgTable(
  "dining_sessions",
  {
    id: idColumn("id").primaryKey(),
    restaurantId: idColumn("restaurant_id").notNull().references(() => restaurants.id),
    tableId: idColumn("table_id").notNull().references(() => physicalTables.id),
    nfcTagId: idColumn("nfc_tag_id").notNull().references(() => nfcTags.id),
    publicToken: varchar("public_token", { length: 255 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    publicExpiresAt: timestamp("public_expires_at", { withTimezone: true }),
    auditExpiresAt: timestamp("audit_expires_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    reopenedFromSessionId: idColumn("reopened_from_session_id"),
    transferTargetTableId: idColumn("transfer_target_table_id"),
    currentCheckId: idColumn("current_check_id"),
    sessionVersion: integer("session_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    sessionRestaurantStatusIdx: index("dining_sessions_restaurant_status_idx").on(table.restaurantId, table.status),
    sessionPublicTokenIdx: uniqueIndex("dining_sessions_public_token_uq").on(table.publicToken)
  })
);

export const checkSnapshots = pgTable(
  "check_snapshots",
  {
    id: idColumn("id").primaryKey(),
    restaurantId: idColumn("restaurant_id").notNull().references(() => restaurants.id),
    sessionId: idColumn("session_id").notNull().references(() => diningSessions.id),
    posCheckId: varchar("pos_check_id", { length: 255 }).notNull(),
    sourceSystem: varchar("source_system", { length: 64 }).notNull().default("unknown"),
    sourceCheckVersion: varchar("source_check_version", { length: 128 }),
    status: varchar("status", { length: 32 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    subtotalCents: integer("subtotal_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    feeCents: integer("fee_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    remainingBalanceCents: integer("remaining_balance_cents").notNull(),
    assignmentSummary: jsonb("assignment_summary"),
    version: integer("version").notNull().default(1),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    snapshotSessionIdx: index("check_snapshots_session_idx").on(table.sessionId, table.version),
    snapshotPosCheckVersionUq: uniqueIndex("check_snapshots_pos_check_version_uq").on(table.posCheckId, table.version)
  })
);

export const checkLineItems = pgTable(
  "check_line_items",
  {
    id: idColumn("id").notNull(),
    checkSnapshotId: idColumn("check_snapshot_id").notNull().references(() => checkSnapshots.id),
    posLineId: varchar("pos_line_id", { length: 255 }).notNull(),
    parentLineId: idColumn("parent_line_id"),
    kind: varchar("kind", { length: 32 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    extendedPriceCents: integer("extended_price_cents").notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    isStandalone: boolean("is_standalone").notNull().default(true),
    isModifier: boolean("is_modifier").notNull().default(false),
    modifierGroup: varchar("modifier_group", { length: 128 }),
    taxCents: integer("tax_cents").notNull().default(0),
    feeCents: integer("fee_cents").notNull().default(0),
    grossCents: integer("gross_cents").notNull().default(0),
    assignedCents: integer("assigned_cents").notNull().default(0),
    assignmentStatus: varchar("assignment_status", { length: 32 }).notNull().default("unassigned"),
    isTinyCharge: boolean("is_tiny_charge").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.checkSnapshotId, table.id], name: "check_line_items_pk" }),
    lineItemSnapshotIdx: index("check_line_items_snapshot_idx").on(table.checkSnapshotId),
    lineItemPosLineUq: uniqueIndex("check_line_items_snapshot_pos_line_uq").on(table.checkSnapshotId, table.posLineId)
  })
);

export const payers = pgTable("payers", {
  id: idColumn("id").primaryKey(),
  sessionId: idColumn("session_id").notNull().references(() => diningSessions.id),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  phoneE164: varchar("phone_e164", { length: 32 }),
  loyaltyProfileId: idColumn("loyalty_profile_id"),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const allocationPlans = pgTable("allocation_plans", {
  id: idColumn("id").primaryKey(),
  sessionId: idColumn("session_id").notNull().references(() => diningSessions.id),
  checkSnapshotId: idColumn("check_snapshot_id").notNull().references(() => checkSnapshots.id),
  checkVersion: integer("check_version").notNull().default(1),
  status: varchar("status", { length: 32 }).notNull(),
  strategy: varchar("strategy", { length: 32 }).notNull(),
  allocationHash: varchar("allocation_hash", { length: 255 }).notNull(),
  version: integer("version").notNull().default(1),
  createdByPayerId: idColumn("created_by_payer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const allocationEntries = pgTable("allocation_entries", {
  id: idColumn("id").primaryKey(),
  allocationPlanId: idColumn("allocation_plan_id").notNull().references(() => allocationPlans.id),
  payerId: idColumn("payer_id").notNull().references(() => payers.id),
  targetType: varchar("target_type", { length: 32 }).notNull(),
  targetId: varchar("target_id", { length: 255 }).notNull(),
  shareBasisPoints: integer("share_basis_points").notNull(),
  assignedCents: integer("assigned_cents").notNull(),
  inheritedFromParent: boolean("inherited_from_parent").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: idColumn("id").primaryKey(),
    sessionId: idColumn("session_id").notNull().references(() => diningSessions.id),
    checkSnapshotId: idColumn("check_snapshot_id").notNull().references(() => checkSnapshots.id),
    checkVersion: integer("check_version").notNull().default(1),
    payerId: idColumn("payer_id").notNull().references(() => payers.id),
    allocationPlanId: idColumn("allocation_plan_id").notNull().references(() => allocationPlans.id),
    status: varchar("status", { length: 64 }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    tipCents: integer("tip_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerPaymentIntentId: varchar("provider_payment_intent_id", { length: 255 }),
    clientSecret: varchar("client_secret", { length: 255 }),
    providerChargeId: varchar("provider_charge_id", { length: 255 }),
    posAttachmentStatus: varchar("pos_attachment_status", { length: 32 }).notNull().default("pending"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    loyaltyAwardedAt: timestamp("loyalty_awarded_at", { withTimezone: true }),
    loyaltyPointsAwarded: integer("loyalty_points_awarded"),
    errorCode: varchar("error_code", { length: 128 }),
    errorMessage: text("error_message"),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    paymentAttemptsSessionIdx: index("payment_attempts_session_idx").on(table.sessionId, table.status),
    paymentIdempotencyUq: uniqueIndex("payment_attempts_idempotency_uq").on(table.idempotencyKey),
    paymentProviderIntentUq: uniqueIndex("payment_attempts_provider_intent_uq").on(table.provider, table.providerPaymentIntentId)
  })
);

export const loyaltyProfiles = pgTable(
  "loyalty_profiles",
  {
    id: idColumn("id").primaryKey(),
    restaurantId: idColumn("restaurant_id").notNull().references(() => restaurants.id),
    phoneE164: varchar("phone_e164", { length: 32 }).notNull(),
    externalCustomerId: varchar("external_customer_id", { length: 255 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    pointsBalance: integer("points_balance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    loyaltyProfilePhoneUq: uniqueIndex("loyalty_profiles_restaurant_phone_uq").on(table.restaurantId, table.phoneE164)
  })
);

export const reconciliationExceptions = pgTable("reconciliation_exceptions", {
  id: idColumn("id").primaryKey(),
  restaurantId: idColumn("restaurant_id").notNull().references(() => restaurants.id),
  sessionId: idColumn("session_id").references(() => diningSessions.id),
  checkSnapshotId: idColumn("check_snapshot_id").references(() => checkSnapshots.id),
  paymentAttemptId: idColumn("payment_attempt_id").references(() => paymentAttempts.id),
  type: varchar("type", { length: 64 }).notNull(),
  severity: varchar("severity", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  summary: varchar("summary", { length: 255 }).notNull(),
  details: jsonb("details"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const auditEvents = pgTable("audit_events", {
  id: idColumn("id").primaryKey(),
  restaurantId: idColumn("restaurant_id").notNull().references(() => restaurants.id),
  sessionId: idColumn("session_id").references(() => diningSessions.id),
  actorType: varchar("actor_type", { length: 64 }).notNull(),
  actorId: varchar("actor_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  subjectType: varchar("subject_type", { length: 128 }).notNull(),
  subjectId: varchar("subject_id", { length: 255 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }),
  correlationId: varchar("correlation_id", { length: 255 }),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const outboxEvents = pgTable("outbox_events", {
  id: idColumn("id").primaryKey(),
  aggregateType: varchar("aggregate_type", { length: 64 }).notNull(),
  aggregateId: varchar("aggregate_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 128 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
