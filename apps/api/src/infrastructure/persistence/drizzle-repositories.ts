import {
  allocationEntries,
  allocationPlans,
  and,
  asc,
  auditEvents,
  checkLineItems,
  checkSnapshots,
  desc,
  type TapsDbClient,
  diningSessions,
  eq,
  inArray,
  loyaltyProfiles,
  lte,
  paymentAttempts,
  payers,
  reconciliationExceptions
} from "@taps/db";
import type {
  AllocationPlan,
  CheckAssignmentSummary,
  CheckLineItem,
  CheckSnapshot,
  DiningSession,
  LoyaltyProfile,
  PaymentAttempt,
  Payer
} from "@taps/contracts";
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
} from "../../modules/repositories";

function toDate(value?: string): Date | null {
  return value ? new Date(value) : null;
}

function toIso(value?: Date | string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function assertRecord<T>(value: unknown): T | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return value as T;
}

function mapSession(row: typeof diningSessions.$inferSelect): DiningSession {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    tableId: row.tableId,
    nfcTagId: row.nfcTagId,
    publicToken: row.publicToken,
    status: row.status as DiningSession["status"],
    openedAt: toIso(row.openedAt)!,
    closedAt: toIso(row.closedAt),
    publicExpiresAt: toIso(row.publicExpiresAt),
    auditExpiresAt: toIso(row.auditExpiresAt),
    archivedAt: toIso(row.archivedAt),
    reopenedFromSessionId: row.reopenedFromSessionId ?? undefined,
    transferTargetTableId: row.transferTargetTableId ?? undefined,
    currentCheckId: row.currentCheckId ?? undefined,
    version: row.sessionVersion,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!
  };
}

function mapCheckLine(row: typeof checkLineItems.$inferSelect): CheckLineItem {
  return {
    id: row.id,
    posLineId: row.posLineId,
    parentLineId: row.parentLineId ?? undefined,
    kind: row.kind as CheckLineItem["kind"],
    name: row.name,
    quantity: row.quantity,
    unitPriceCents: row.unitPriceCents,
    extendedPriceCents: row.extendedPriceCents,
    status: row.status as CheckLineItem["status"],
    isStandalone: row.isStandalone,
    isModifier: row.isModifier,
    modifierGroup: row.modifierGroup ?? undefined,
    taxCents: row.taxCents,
    feeCents: row.feeCents,
    grossCents: row.grossCents,
    assignedCents: row.assignedCents,
    childLineIds: [],
    assignmentStatus: row.assignmentStatus as CheckLineItem["assignmentStatus"],
    isTinyCharge: row.isTinyCharge,
    metadata: assertRecord<Record<string, unknown>>(row.metadata)
  };
}

function mapCheckSnapshot(
  row: typeof checkSnapshots.$inferSelect,
  lines: typeof checkLineItems.$inferSelect[]
): CheckSnapshot {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    sessionId: row.sessionId,
    posCheckId: row.posCheckId,
    sourceSystem: row.sourceSystem,
    sourceCheckVersion: row.sourceCheckVersion ?? undefined,
    status: row.status as CheckSnapshot["status"],
    currency: row.currency as CheckSnapshot["currency"],
    subtotalCents: row.subtotalCents,
    taxCents: row.taxCents,
    feeCents: row.feeCents,
    discountCents: row.discountCents,
    totalCents: row.totalCents,
    amountPaidCents: row.amountPaidCents,
    remainingBalanceCents: row.remainingBalanceCents,
    assignmentSummary: (assertRecord<CheckAssignmentSummary>(row.assignmentSummary) ?? {
      completeness: "unassigned",
      assignedLineCents: 0,
      unassignedLineCents: row.totalCents,
      outstandingBalanceCents: row.remainingBalanceCents,
      unassignedLineItemIds: [],
      unassignedTinyItemIds: []
    }) as CheckAssignmentSummary,
    sourceUpdatedAt: toIso(row.sourceUpdatedAt)!,
    closedAt: toIso(row.closedAt),
    version: row.version,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
    lines: lines.map(mapCheckLine)
  };
}

function mapPlan(
  row: typeof allocationPlans.$inferSelect,
  entries: typeof allocationEntries.$inferSelect[]
): AllocationPlan {
  return {
    id: row.id,
    sessionId: row.sessionId,
    checkSnapshotId: row.checkSnapshotId,
    checkVersion: row.checkVersion,
    status: row.status as AllocationPlan["status"],
    strategy: row.strategy as AllocationPlan["strategy"],
    allocationHash: row.allocationHash,
    version: row.version,
    createdByPayerId: row.createdByPayerId ?? undefined,
    createdAt: toIso(row.createdAt)!,
    entries: entries.map((entry) => ({
      id: entry.id,
      payerId: entry.payerId,
      targetType: entry.targetType as AllocationPlan["entries"][number]["targetType"],
      targetId: entry.targetId,
      shareBasisPoints: entry.shareBasisPoints,
      assignedCents: entry.assignedCents,
      inheritedFromParent: entry.inheritedFromParent,
      metadata: assertRecord<Record<string, unknown>>(entry.metadata)
    }))
  };
}

function mapPayer(row: typeof payers.$inferSelect): Payer {
  return {
    id: row.id,
    sessionId: row.sessionId,
    displayName: row.displayName,
    phoneE164: row.phoneE164 ?? undefined,
    loyaltyProfileId: row.loyaltyProfileId ?? undefined,
    status: row.status as Payer["status"]
  };
}

function mapPaymentAttempt(row: typeof paymentAttempts.$inferSelect): PaymentAttempt {
  return {
    id: row.id,
    sessionId: row.sessionId,
    checkSnapshotId: row.checkSnapshotId,
    checkVersion: row.checkVersion,
    payerId: row.payerId,
    allocationPlanId: row.allocationPlanId,
    status: row.status as PaymentAttempt["status"],
    amountCents: row.amountCents,
    tipCents: row.tipCents,
    currency: row.currency as PaymentAttempt["currency"],
    provider: row.provider,
    providerPaymentIntentId: row.providerPaymentIntentId ?? undefined,
    clientSecret: row.clientSecret ?? undefined,
    providerChargeId: row.providerChargeId ?? undefined,
    posAttachmentStatus: row.posAttachmentStatus as PaymentAttempt["posAttachmentStatus"],
    idempotencyKey: row.idempotencyKey,
    authorizedAt: toIso(row.authorizedAt),
    capturedAt: toIso(row.capturedAt),
    failedAt: toIso(row.failedAt),
    loyaltyAwardedAt: toIso(row.loyaltyAwardedAt),
    loyaltyPointsAwarded: row.loyaltyPointsAwarded ?? undefined,
    errorCode: row.errorCode ?? undefined,
    errorMessage: row.errorMessage ?? undefined
  };
}

function mapLoyaltyProfile(row: typeof loyaltyProfiles.$inferSelect): LoyaltyProfile {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    phoneE164: row.phoneE164,
    externalCustomerId: row.externalCustomerId ?? undefined,
    status: row.status as LoyaltyProfile["status"],
    pointsBalance: row.pointsBalance
  };
}

function mapException(row: typeof reconciliationExceptions.$inferSelect): ReconciliationExceptionRecord {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    sessionId: row.sessionId ?? undefined,
    checkSnapshotId: row.checkSnapshotId ?? undefined,
    paymentAttemptId: row.paymentAttemptId ?? undefined,
    type: row.type,
    severity: row.severity as ReconciliationExceptionRecord["severity"],
    status: row.status as ReconciliationExceptionRecord["status"],
    summary: row.summary,
    details: assertRecord<Record<string, unknown>>(row.details),
    detectedAt: toIso(row.detectedAt)!,
    resolvedAt: toIso(row.resolvedAt)
  };
}

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: TapsDbClient) {}

  async findByPublicToken(token: string): Promise<DiningSession | null> {
    const [row] = await this.db.select().from(diningSessions).where(eq(diningSessions.publicToken, token)).limit(1);
    return row ? mapSession(row) : null;
  }

  async findActiveByTable(restaurantId: string, tableId: string): Promise<DiningSession | null> {
    const [row] = await this.db
      .select()
      .from(diningSessions)
      .where(
        and(
          eq(diningSessions.restaurantId, restaurantId),
          eq(diningSessions.tableId, tableId),
          inArray(diningSessions.status, ["active", "payment_in_progress", "partially_paid", "fully_paid"])
        )
      )
      .orderBy(desc(diningSessions.updatedAt))
      .limit(1);
    return row ? mapSession(row) : null;
  }

  async findById(id: string): Promise<DiningSession | null> {
    const [row] = await this.db.select().from(diningSessions).where(eq(diningSessions.id, id)).limit(1);
    return row ? mapSession(row) : null;
  }

  async listByRestaurant(restaurantId: string, status?: string): Promise<DiningSession[]> {
    const rows = await this.db
      .select()
      .from(diningSessions)
      .where(
        status
          ? and(eq(diningSessions.restaurantId, restaurantId), eq(diningSessions.status, status))
          : eq(diningSessions.restaurantId, restaurantId)
      )
      .orderBy(desc(diningSessions.openedAt));
    return rows.map(mapSession);
  }

  async save(session: DiningSession): Promise<DiningSession> {
    await this.db
      .insert(diningSessions)
      .values({
        id: session.id,
        restaurantId: session.restaurantId,
        tableId: session.tableId,
        nfcTagId: session.nfcTagId,
        publicToken: session.publicToken,
        status: session.status,
        openedAt: new Date(session.openedAt),
        closedAt: toDate(session.closedAt),
        publicExpiresAt: toDate(session.publicExpiresAt),
        auditExpiresAt: toDate(session.auditExpiresAt),
        archivedAt: toDate(session.archivedAt),
        reopenedFromSessionId: session.reopenedFromSessionId ?? null,
        transferTargetTableId: session.transferTargetTableId ?? null,
        currentCheckId: session.currentCheckId ?? null,
        sessionVersion: session.version,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt)
      })
      .onConflictDoUpdate({
        target: diningSessions.id,
        set: {
          status: session.status,
          publicToken: session.publicToken,
          closedAt: toDate(session.closedAt),
          publicExpiresAt: toDate(session.publicExpiresAt),
          auditExpiresAt: toDate(session.auditExpiresAt),
          archivedAt: toDate(session.archivedAt),
          reopenedFromSessionId: session.reopenedFromSessionId ?? null,
          transferTargetTableId: session.transferTargetTableId ?? null,
          currentCheckId: session.currentCheckId ?? null,
          sessionVersion: session.version,
          updatedAt: new Date(session.updatedAt)
        }
      });

    return session;
  }

  async listExpirable(nowIso: string): Promise<DiningSession[]> {
    const rows = await this.db
      .select()
      .from(diningSessions)
      .where(
        and(
          eq(diningSessions.status, "closed"),
          lte(diningSessions.publicExpiresAt, new Date(nowIso))
        )
      );
    return rows.map(mapSession);
  }

  async listArchivable(nowIso: string): Promise<DiningSession[]> {
    const rows = await this.db
      .select()
      .from(diningSessions)
      .where(
        and(
          inArray(diningSessions.status, ["public_expired", "cleared_locked"]),
          lte(diningSessions.auditExpiresAt, new Date(nowIso))
        )
      );
    return rows.map(mapSession);
  }
}

export class DrizzleCheckRepository implements CheckRepository {
  constructor(private readonly db: TapsDbClient) {}

  async findLatestBySession(sessionId: string): Promise<CheckSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(checkSnapshots)
      .where(eq(checkSnapshots.sessionId, sessionId))
      .orderBy(desc(checkSnapshots.version), desc(checkSnapshots.createdAt))
      .limit(1);

    if (!row) {
      return null;
    }

    const lines = await this.db
      .select()
      .from(checkLineItems)
      .where(eq(checkLineItems.checkSnapshotId, row.id))
      .orderBy(asc(checkLineItems.createdAt));

    return mapCheckSnapshot(row, lines);
  }

  async save(snapshot: CheckSnapshot): Promise<CheckSnapshot> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(checkSnapshots)
        .values({
          id: snapshot.id,
          restaurantId: snapshot.restaurantId,
          sessionId: snapshot.sessionId,
          posCheckId: snapshot.posCheckId,
          sourceSystem: snapshot.sourceSystem,
          sourceCheckVersion: snapshot.sourceCheckVersion ?? null,
          status: snapshot.status,
          currency: snapshot.currency,
          subtotalCents: snapshot.subtotalCents,
          taxCents: snapshot.taxCents,
          feeCents: snapshot.feeCents,
          discountCents: snapshot.discountCents,
          totalCents: snapshot.totalCents,
          amountPaidCents: snapshot.amountPaidCents,
          remainingBalanceCents: snapshot.remainingBalanceCents,
          assignmentSummary: snapshot.assignmentSummary,
          version: snapshot.version,
          sourceUpdatedAt: new Date(snapshot.sourceUpdatedAt),
          closedAt: toDate(snapshot.closedAt),
          createdAt: new Date(snapshot.createdAt),
          updatedAt: new Date(snapshot.updatedAt)
        })
        .onConflictDoUpdate({
          target: checkSnapshots.id,
          set: {
            status: snapshot.status,
            sourceSystem: snapshot.sourceSystem,
            sourceCheckVersion: snapshot.sourceCheckVersion ?? null,
            currency: snapshot.currency,
            subtotalCents: snapshot.subtotalCents,
            taxCents: snapshot.taxCents,
            feeCents: snapshot.feeCents,
            discountCents: snapshot.discountCents,
            totalCents: snapshot.totalCents,
            amountPaidCents: snapshot.amountPaidCents,
            remainingBalanceCents: snapshot.remainingBalanceCents,
            assignmentSummary: snapshot.assignmentSummary,
            version: snapshot.version,
            sourceUpdatedAt: new Date(snapshot.sourceUpdatedAt),
            closedAt: toDate(snapshot.closedAt),
            updatedAt: new Date(snapshot.updatedAt)
          }
        });

      await tx.delete(checkLineItems).where(eq(checkLineItems.checkSnapshotId, snapshot.id));

      if (snapshot.lines.length) {
        await tx.insert(checkLineItems).values(
          snapshot.lines.map((line) => ({
            id: line.id,
            checkSnapshotId: snapshot.id,
            posLineId: line.posLineId,
            parentLineId: line.parentLineId ?? null,
            kind: line.kind,
            name: line.name,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            extendedPriceCents: line.extendedPriceCents,
            status: line.status,
            isStandalone: line.isStandalone,
            isModifier: line.isModifier,
            modifierGroup: line.modifierGroup ?? null,
            taxCents: line.taxCents ?? 0,
            feeCents: line.feeCents ?? 0,
            grossCents: line.grossCents,
            assignedCents: line.assignedCents,
            assignmentStatus: line.assignmentStatus,
            isTinyCharge: line.isTinyCharge,
            metadata: line.metadata ?? null,
            createdAt: new Date(snapshot.createdAt),
            updatedAt: new Date(snapshot.updatedAt)
          }))
        );
      }
    });

    return snapshot;
  }
}

export class DrizzleAllocationPlanRepository implements AllocationPlanRepository {
  constructor(private readonly db: TapsDbClient) {}

  async findById(id: string): Promise<AllocationPlan | null> {
    const [row] = await this.db.select().from(allocationPlans).where(eq(allocationPlans.id, id)).limit(1);
    if (!row) {
      return null;
    }

    const entries = await this.db
      .select()
      .from(allocationEntries)
      .where(eq(allocationEntries.allocationPlanId, id))
      .orderBy(asc(allocationEntries.createdAt));
    return mapPlan(row, entries);
  }

  async findLatestByCheck(checkSnapshotId: string): Promise<AllocationPlan | null> {
    const [row] = await this.db
      .select()
      .from(allocationPlans)
      .where(eq(allocationPlans.checkSnapshotId, checkSnapshotId))
      .orderBy(desc(allocationPlans.checkVersion), desc(allocationPlans.version), desc(allocationPlans.createdAt))
      .limit(1);
    if (!row) {
      return null;
    }

    const entries = await this.db
      .select()
      .from(allocationEntries)
      .where(eq(allocationEntries.allocationPlanId, row.id))
      .orderBy(asc(allocationEntries.createdAt));
    return mapPlan(row, entries);
  }

  async findLatestBySession(sessionId: string): Promise<AllocationPlan | null> {
    const [row] = await this.db
      .select()
      .from(allocationPlans)
      .where(eq(allocationPlans.sessionId, sessionId))
      .orderBy(desc(allocationPlans.checkVersion), desc(allocationPlans.version), desc(allocationPlans.createdAt))
      .limit(1);
    if (!row) {
      return null;
    }

    const entries = await this.db
      .select()
      .from(allocationEntries)
      .where(eq(allocationEntries.allocationPlanId, row.id))
      .orderBy(asc(allocationEntries.createdAt));
    return mapPlan(row, entries);
  }

  async save(plan: AllocationPlan): Promise<AllocationPlan> {
    const nowIso = new Date().toISOString();
    await this.db.transaction(async (tx) => {
      await tx
        .insert(allocationPlans)
        .values({
          id: plan.id,
          sessionId: plan.sessionId,
          checkSnapshotId: plan.checkSnapshotId,
          checkVersion: plan.checkVersion,
          status: plan.status,
          strategy: plan.strategy,
          allocationHash: plan.allocationHash,
          version: plan.version,
          createdByPayerId: plan.createdByPayerId ?? null,
          createdAt: new Date(plan.createdAt),
          updatedAt: new Date(nowIso)
        })
        .onConflictDoUpdate({
          target: allocationPlans.id,
          set: {
            checkSnapshotId: plan.checkSnapshotId,
            checkVersion: plan.checkVersion,
            status: plan.status,
            strategy: plan.strategy,
            allocationHash: plan.allocationHash,
            version: plan.version,
            createdByPayerId: plan.createdByPayerId ?? null,
            updatedAt: new Date(nowIso)
          }
        });

      await tx.delete(allocationEntries).where(eq(allocationEntries.allocationPlanId, plan.id));

      if (plan.entries.length) {
        await tx.insert(allocationEntries).values(
          plan.entries.map((entry) => ({
            id: entry.id,
            allocationPlanId: plan.id,
            payerId: entry.payerId,
            targetType: entry.targetType,
            targetId: entry.targetId,
            shareBasisPoints: entry.shareBasisPoints,
            assignedCents: entry.assignedCents,
            inheritedFromParent: entry.inheritedFromParent ?? false,
            metadata: entry.metadata ?? null,
            createdAt: new Date(plan.createdAt),
            updatedAt: new Date(nowIso)
          }))
        );
      }
    });

    return plan;
  }
}

export class DrizzlePayerRepository implements PayerRepository {
  constructor(private readonly db: TapsDbClient) {}

  async listBySession(sessionId: string): Promise<Payer[]> {
    const rows = await this.db.select().from(payers).where(eq(payers.sessionId, sessionId)).orderBy(asc(payers.createdAt));
    return rows.map(mapPayer);
  }

  async findById(id: string): Promise<Payer | null> {
    const [row] = await this.db.select().from(payers).where(eq(payers.id, id)).limit(1);
    return row ? mapPayer(row) : null;
  }

  async save(payer: Payer): Promise<Payer> {
    const now = new Date().toISOString();
    await this.db
      .insert(payers)
      .values({
        id: payer.id,
        sessionId: payer.sessionId,
        displayName: payer.displayName,
        phoneE164: payer.phoneE164 ?? null,
        loyaltyProfileId: payer.loyaltyProfileId ?? null,
        status: payer.status,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      })
      .onConflictDoUpdate({
        target: payers.id,
        set: {
          displayName: payer.displayName,
          phoneE164: payer.phoneE164 ?? null,
          loyaltyProfileId: payer.loyaltyProfileId ?? null,
          status: payer.status,
          updatedAt: new Date(now)
        }
      });

    return (await this.findById(payer.id)) ?? payer;
  }
}

export class DrizzlePaymentAttemptRepository implements PaymentAttemptRepository {
  constructor(private readonly db: TapsDbClient) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentAttempt | null> {
    const [row] = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.idempotencyKey, idempotencyKey))
      .limit(1);
    return row ? mapPaymentAttempt(row) : null;
  }

  async findById(id: string): Promise<PaymentAttempt | null> {
    const [row] = await this.db.select().from(paymentAttempts).where(eq(paymentAttempts.id, id)).limit(1);
    return row ? mapPaymentAttempt(row) : null;
  }

  async findByProviderPaymentIntentId(provider: string, providerPaymentIntentId: string): Promise<PaymentAttempt | null> {
    const [row] = await this.db
      .select()
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.provider, provider),
          eq(paymentAttempts.providerPaymentIntentId, providerPaymentIntentId)
        )
      )
      .orderBy(desc(paymentAttempts.updatedAt))
      .limit(1);
    return row ? mapPaymentAttempt(row) : null;
  }

  async listBySession(sessionId: string): Promise<PaymentAttempt[]> {
    const rows = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.sessionId, sessionId))
      .orderBy(asc(paymentAttempts.createdAt));
    return rows.map(mapPaymentAttempt);
  }

  async listPendingBySession(sessionId: string): Promise<PaymentAttempt[]> {
    const rows = await this.db
      .select()
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.sessionId, sessionId),
          inArray(paymentAttempts.status, [
            "draft",
            "intent_created",
            "authorization_pending",
            "authorized",
            "capture_pending"
          ])
        )
      )
      .orderBy(asc(paymentAttempts.createdAt));
    return rows.map(mapPaymentAttempt);
  }

  async save(paymentAttempt: PaymentAttempt): Promise<PaymentAttempt> {
    const nowIso = new Date().toISOString();
    await this.db
      .insert(paymentAttempts)
      .values({
        id: paymentAttempt.id,
        sessionId: paymentAttempt.sessionId,
        checkSnapshotId: paymentAttempt.checkSnapshotId,
        checkVersion: paymentAttempt.checkVersion,
        payerId: paymentAttempt.payerId,
        allocationPlanId: paymentAttempt.allocationPlanId,
        status: paymentAttempt.status,
        amountCents: paymentAttempt.amountCents,
        tipCents: paymentAttempt.tipCents,
        currency: paymentAttempt.currency,
        provider: paymentAttempt.provider,
        providerPaymentIntentId: paymentAttempt.providerPaymentIntentId ?? null,
        clientSecret: paymentAttempt.clientSecret ?? null,
        providerChargeId: paymentAttempt.providerChargeId ?? null,
        posAttachmentStatus: paymentAttempt.posAttachmentStatus,
        idempotencyKey: paymentAttempt.idempotencyKey,
        authorizedAt: toDate(paymentAttempt.authorizedAt),
        capturedAt: toDate(paymentAttempt.capturedAt),
        failedAt: toDate(paymentAttempt.failedAt),
        loyaltyAwardedAt: toDate(paymentAttempt.loyaltyAwardedAt),
        loyaltyPointsAwarded: paymentAttempt.loyaltyPointsAwarded ?? null,
        errorCode: paymentAttempt.errorCode ?? null,
        errorMessage: paymentAttempt.errorMessage ?? null,
        createdAt: new Date(nowIso),
        updatedAt: new Date(nowIso)
      })
      .onConflictDoUpdate({
        target: paymentAttempts.id,
        set: {
          checkSnapshotId: paymentAttempt.checkSnapshotId,
          checkVersion: paymentAttempt.checkVersion,
          payerId: paymentAttempt.payerId,
          allocationPlanId: paymentAttempt.allocationPlanId,
          status: paymentAttempt.status,
          amountCents: paymentAttempt.amountCents,
          tipCents: paymentAttempt.tipCents,
          currency: paymentAttempt.currency,
          provider: paymentAttempt.provider,
          providerPaymentIntentId: paymentAttempt.providerPaymentIntentId ?? null,
          clientSecret: paymentAttempt.clientSecret ?? null,
          providerChargeId: paymentAttempt.providerChargeId ?? null,
          posAttachmentStatus: paymentAttempt.posAttachmentStatus,
          idempotencyKey: paymentAttempt.idempotencyKey,
          authorizedAt: toDate(paymentAttempt.authorizedAt),
          capturedAt: toDate(paymentAttempt.capturedAt),
          failedAt: toDate(paymentAttempt.failedAt),
          loyaltyAwardedAt: toDate(paymentAttempt.loyaltyAwardedAt),
          loyaltyPointsAwarded: paymentAttempt.loyaltyPointsAwarded ?? null,
          errorCode: paymentAttempt.errorCode ?? null,
          errorMessage: paymentAttempt.errorMessage ?? null,
          updatedAt: new Date(nowIso)
        }
      });

    return (await this.findById(paymentAttempt.id)) ?? paymentAttempt;
  }
}

export class DrizzleLoyaltyProfileRepository implements LoyaltyProfileRepository {
  constructor(private readonly db: TapsDbClient) {}

  async findById(id: string): Promise<LoyaltyProfile | null> {
    const [row] = await this.db.select().from(loyaltyProfiles).where(eq(loyaltyProfiles.id, id)).limit(1);
    return row ? mapLoyaltyProfile(row) : null;
  }

  async findByPhone(restaurantId: string, phoneE164: string): Promise<LoyaltyProfile | null> {
    const [row] = await this.db
      .select()
      .from(loyaltyProfiles)
      .where(and(eq(loyaltyProfiles.restaurantId, restaurantId), eq(loyaltyProfiles.phoneE164, phoneE164)))
      .limit(1);
    return row ? mapLoyaltyProfile(row) : null;
  }

  async save(profile: LoyaltyProfile): Promise<LoyaltyProfile> {
    const now = new Date();
    await this.db
      .insert(loyaltyProfiles)
      .values({
        id: profile.id,
        restaurantId: profile.restaurantId,
        phoneE164: profile.phoneE164,
        externalCustomerId: profile.externalCustomerId ?? null,
        status: profile.status,
        pointsBalance: profile.pointsBalance,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: loyaltyProfiles.id,
        set: {
          externalCustomerId: profile.externalCustomerId ?? null,
          status: profile.status,
          pointsBalance: profile.pointsBalance,
          updatedAt: now
        }
      });

    return (await this.findById(profile.id)) ?? profile;
  }
}

export class DrizzleReconciliationExceptionRepository implements ReconciliationExceptionRepository {
  constructor(private readonly db: TapsDbClient) {}

  async create(exception: ReconciliationExceptionRecord): Promise<ReconciliationExceptionRecord> {
    await this.db.insert(reconciliationExceptions).values({
      id: exception.id,
      restaurantId: exception.restaurantId,
      sessionId: exception.sessionId ?? null,
      checkSnapshotId: exception.checkSnapshotId ?? null,
      paymentAttemptId: exception.paymentAttemptId ?? null,
      type: exception.type,
      severity: exception.severity,
      status: exception.status,
      summary: exception.summary,
      details: exception.details ?? null,
      detectedAt: new Date(exception.detectedAt),
      resolvedAt: toDate(exception.resolvedAt),
      createdAt: new Date(exception.detectedAt),
      updatedAt: new Date(exception.detectedAt)
    });
    return exception;
  }

  async listOpenBySession(sessionId: string): Promise<ReconciliationExceptionRecord[]> {
    const rows = await this.db
      .select()
      .from(reconciliationExceptions)
      .where(and(eq(reconciliationExceptions.sessionId, sessionId), eq(reconciliationExceptions.status, "open")))
      .orderBy(asc(reconciliationExceptions.detectedAt));
    return rows.map(mapException);
  }

  async resolve(id: string, resolvedAt: string): Promise<void> {
    await this.db
      .update(reconciliationExceptions)
      .set({
        status: "resolved",
        resolvedAt: new Date(resolvedAt),
        updatedAt: new Date(resolvedAt)
      })
      .where(eq(reconciliationExceptions.id, id));
  }
}

export class DrizzleAuditRepository implements AuditRepository {
  constructor(private readonly db: TapsDbClient) {}

  async record(entry: AuditLogRecord): Promise<void> {
    await this.db.insert(auditEvents).values({
      id: entry.id,
      restaurantId: entry.restaurantId,
      sessionId: entry.sessionId ?? null,
      actorType: entry.actorType,
      actorId: entry.actorId,
      action: entry.action,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      idempotencyKey: entry.idempotencyKey ?? null,
      correlationId: entry.correlationId ?? null,
      payload: entry.payload ?? null,
      createdAt: new Date(entry.createdAt)
    });
  }
}

export function createDrizzleRepositories(db: TapsDbClient) {
  return {
    sessions: new DrizzleSessionRepository(db),
    checks: new DrizzleCheckRepository(db),
    plans: new DrizzleAllocationPlanRepository(db),
    payers: new DrizzlePayerRepository(db),
    paymentAttempts: new DrizzlePaymentAttemptRepository(db),
    loyaltyProfiles: new DrizzleLoyaltyProfileRepository(db),
    exceptions: new DrizzleReconciliationExceptionRepository(db),
    audit: new DrizzleAuditRepository(db)
  };
}
