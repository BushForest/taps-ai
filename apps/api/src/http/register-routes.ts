import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AdminTokenPayload } from "./auth";

declare module "fastify" {
  interface FastifyRequest {
    adminPayload?: AdminTokenPayload;
  }
}
import type { CloseValidationResult, DiningSession, GetSessionStatusResponse } from "@taps/contracts";
import { createLogger } from "@taps/observability";
import { DomainError, NotFoundError } from "../lib/errors";
import { newId } from "../lib/idempotency";
import type { AppContainer } from "../bootstrap/create-container";
import { parseSquareWebhookEvent } from "./webhooks/square";
import { parseStripeWebhookEvent } from "./webhooks/stripe";
import { extractBearerToken, verifyJwt, JwtVerificationError } from "./auth";

const log = createLogger({ service: "api" });

function buildContext(restaurantId: string, actor: { type: "guest" | "restaurant_admin" | "system"; id: string }) {
  return {
    correlationId: randomUUID(),
    restaurantId,
    actor
  };
}

async function resolveSessionFromToken(container: AppContainer, publicToken: string): Promise<DiningSession> {
  const access = await container.agents.sessionAgent.validatePublicAccess(publicToken);
  if (!access.publicAccessAllowed) {
    throw new DomainError(`Session is no longer publicly available (${access.reason ?? "denied"})`, "SESSION_EXPIRED", 410);
  }

  return access.session;
}

async function syncSessionFromCheck(container: AppContainer, session: DiningSession, checkSnapshot: { amountPaidCents: number; remainingBalanceCents: number }) {
  const pendingPayments = await container.repositories.paymentAttempts.listPendingBySession(session.id);
  return container.agents.sessionAgent.syncSettlementState(session.id, {
    amountPaidCents: checkSnapshot.amountPaidCents,
    remainingBalanceCents: checkSnapshot.remainingBalanceCents,
    hasPendingPayments: pendingPayments.length > 0
  }, {
    actorType: "system",
    actorId: "route_check_sync"
  });
}

function fallbackCloseValidation(checkSnapshot: {
  remainingBalanceCents: number;
  assignmentSummary: { unassignedLineItemIds: string[] };
}): CloseValidationResult {
  return {
    canClose: checkSnapshot.remainingBalanceCents <= 1 && checkSnapshot.assignmentSummary.unassignedLineItemIds.length === 0,
    reasons: [
      ...(checkSnapshot.remainingBalanceCents <= 1 ? [] : ["Remaining balance exceeds tolerance"]),
      ...(checkSnapshot.assignmentSummary.unassignedLineItemIds.length === 0 ? [] : ["Unassigned payable items remain"])
    ],
    unassignedLineItemIds: checkSnapshot.assignmentSummary.unassignedLineItemIds,
    remainingBalanceCents: checkSnapshot.remainingBalanceCents,
    toleranceExceededByCents: Math.max(checkSnapshot.remainingBalanceCents - 1, 0)
  };
}

async function buildGuestSessionStatusResponse(
  container: AppContainer,
  session: DiningSession,
  actor: { type: "guest" | "restaurant_admin" | "system"; id: string }
): Promise<GetSessionStatusResponse> {
  const access = await container.agents.sessionAgent.validatePublicAccess(session.publicToken);

  if (!access.publicAccessAllowed) {
    return {
      access,
      session: access.session
    };
  }

  const refreshed = (await container.agents.checkAgent.refreshCheckSnapshot(
    container.restaurantConfig.posProviderKey,
    { ...buildContext(session.restaurantId, actor), restaurantId: session.restaurantId },
    session
  )).snapshot;
  const latestPlan = await container.repositories.plans.findLatestBySession(session.id);
  const normalizedCheck = container.agents.checkAgent.buildGuestCheckSnapshot(refreshed, latestPlan);
  const syncedSession = await syncSessionFromCheck(container, session, normalizedCheck);
  const pendingPayments = await container.repositories.paymentAttempts.listPendingBySession(session.id);
  const openExceptions = await container.repositories.exceptions.listOpenBySession(session.id);
  const payers = await container.repositories.payers.listBySession(session.id);
  const closeValidation = latestPlan
    ? container.agents.splitAgent.enforceCloseRules({
        check: normalizedCheck,
        plan: latestPlan,
        hasPendingPayments: pendingPayments.length > 0,
        hasBlockingMismatch: openExceptions.length > 0
      })
    : fallbackCloseValidation(normalizedCheck);

  return {
    access: {
      ...access,
      session: syncedSession
    },
    session: syncedSession,
    check: normalizedCheck,
    payers,
    closeValidation,
    settlement: {
      tableComplete: syncedSession.status === "closed",
      tableCloseable: closeValidation.canClose,
      remainingBalanceCents: normalizedCheck.remainingBalanceCents,
      assignmentCompleteness: normalizedCheck.assignmentSummary.completeness,
      hasPendingPayments: pendingPayments.length > 0,
      hasBlockingMismatch: openExceptions.length > 0,
      checkVersion: normalizedCheck.version,
      lastUpdatedAt: normalizedCheck.updatedAt,
      unassignedLineItemIds: normalizedCheck.assignmentSummary.unassignedLineItemIds,
      unassignedTinyItemIds: normalizedCheck.assignmentSummary.unassignedTinyItemIds,
      payerCompletionCount: payers.filter((payer) => payer.status === "completed").length,
      totalPayerCount: payers.length
    }
  };
}

export async function registerRoutes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: FastifyInstance<any, any, any, any>,
  container: AppContainer,
  runtime?: { apiBaseUrl?: string; stripeWebhookSecret?: string; squareWebhookSignatureKey?: string; jwtSecret?: string }
): Promise<void> {
  app.get("/health", async () => ({
    ok: true,
    service: "taps-api"
  }));

  app.post("/public/taps/:tagCode/session", async (request) => {
    const params = z.object({ tagCode: z.string().min(1) }).parse(request.params);
    const context = buildContext(container.restaurantConfig.id, { type: "guest", id: "guest_tap" });
    const session = await container.agents.sessionAgent.createSession(
      params.tagCode,
      container.restaurantConfig.posProviderKey,
      context,
      {
        publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
        supportRetentionDays: container.restaurantConfig.supportRetentionDays
      }
    );
    const check = await container.agents.checkAgent.fetchOrCreateOpenCheck(
      container.restaurantConfig.posProviderKey,
      { ...context, restaurantId: session.restaurantId },
      session,
      true
    );
    const normalizedCheck = container.agents.checkAgent.buildGuestCheckSnapshot(check);
    await syncSessionFromCheck(container, session, normalizedCheck);
    const menu = await container.agents.menuAgent.fetchMenu(container.restaurantConfig.posProviderKey, {
      ...context,
      restaurantId: session.restaurantId
    });

    return {
      access: await container.agents.sessionAgent.validatePublicAccess(session.publicToken),
      check: normalizedCheck,
      menu
    };
  });

  app.get("/public/sessions/:publicToken", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    return container.agents.sessionAgent.validatePublicAccess(params.publicToken);
  });

  app.get("/public/sessions/:publicToken/status", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const access = await container.agents.sessionAgent.validatePublicAccess(params.publicToken);
    return buildGuestSessionStatusResponse(container, access.session, { type: "guest", id: "guest_status" });
  });

  app.get("/public/sessions/:publicToken/summary", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const access = await container.agents.sessionAgent.validatePublicAccess(params.publicToken);
    return buildGuestSessionStatusResponse(container, access.session, { type: "guest", id: "guest_summary" });
  });

  app.get("/public/sessions/:publicToken/menu", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const session = await resolveSessionFromToken(container, params.publicToken);
    return container.agents.menuAgent.fetchMenu(container.restaurantConfig.posProviderKey, {
      ...buildContext(session.restaurantId, { type: "guest", id: "guest_menu" }),
      restaurantId: session.restaurantId
    });
  });

  app.get("/public/restaurants/:restaurantId/menu", async (request) => {
    const params = z.object({ restaurantId: z.string().min(1) }).parse(request.params);
    if (params.restaurantId !== container.restaurantConfig.id) {
      throw new NotFoundError(`Restaurant ${params.restaurantId} not found`);
    }

    return container.agents.menuAgent.fetchMenu(container.restaurantConfig.posProviderKey, {
      ...buildContext(params.restaurantId, { type: "guest", id: "public_restaurant_menu" }),
      restaurantId: params.restaurantId
    });
  });

  app.get("/public/sessions/:publicToken/check", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const session = await resolveSessionFromToken(container, params.publicToken);
    const result = await container.agents.checkAgent.refreshCheckSnapshot(
      container.restaurantConfig.posProviderKey,
      { ...buildContext(session.restaurantId, { type: "guest", id: "guest_check" }), restaurantId: session.restaurantId },
      session
    );
    const latestPlan = await container.repositories.plans.findLatestBySession(session.id);
    const normalizedSnapshot = container.agents.checkAgent.buildGuestCheckSnapshot(result.snapshot, latestPlan);
    await syncSessionFromCheck(container, session, normalizedSnapshot);
    return {
      snapshot: normalizedSnapshot,
      changes: result.changes
    };
  });

  app.post("/public/sessions/:publicToken/payers", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const body = z.object({ displayName: z.string().min(1), phoneE164: z.string().optional() }).parse(request.body);
    const session = await resolveSessionFromToken(container, params.publicToken);
    const payer = await container.repositories.payers.save({
      id: newId("payer"),
      sessionId: session.id,
      displayName: body.displayName,
      phoneE164: body.phoneE164,
      status: "active"
    });
    return payer;
  });

  app.get("/public/sessions/:publicToken/payers", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const session = await resolveSessionFromToken(container, params.publicToken);
    return container.repositories.payers.listBySession(session.id);
  });

  app.post("/public/sessions/:publicToken/allocations/even", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const body = z.object({ checkVersion: z.number().int().positive() }).parse(request.body);
    const session = await resolveSessionFromToken(container, params.publicToken);
    const payers = await container.repositories.payers.listBySession(session.id);
    const check = (await container.agents.checkAgent.refreshCheckSnapshot(
      container.restaurantConfig.posProviderKey,
      { ...buildContext(session.restaurantId, { type: "guest", id: "guest_split_even" }), restaurantId: session.restaurantId },
      session
    )).snapshot;
    container.agents.splitAgent.assertFreshCheckVersion(body.checkVersion, check);

    const plan = await container.agents.splitAgent.splitEvenly(check, payers);
    return {
      allocationPlan: plan,
      closeValidation: container.agents.splitAgent.validateNoOrphanItems(check, plan),
      check: container.agents.checkAgent.buildGuestCheckSnapshot(check, plan)
    };
  });

  app.post("/public/sessions/:publicToken/allocations/by-item", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const body = z
      .object({
        payerId: z.string().min(1),
        checkVersion: z.number().int().positive(),
        lineItemIds: z.array(z.string().min(1)).min(1)
      })
      .parse(request.body);
    const session = await resolveSessionFromToken(container, params.publicToken);
    const check = (await container.agents.checkAgent.refreshCheckSnapshot(
      container.restaurantConfig.posProviderKey,
      { ...buildContext(session.restaurantId, { type: "guest", id: "guest_split_by_item" }), restaurantId: session.restaurantId },
      session
    )).snapshot;
    container.agents.splitAgent.assertFreshCheckVersion(body.checkVersion, check);
    const existingPlan = await container.repositories.plans.findLatestBySession(session.id);
    const plan = await container.agents.splitAgent.assignItemsToPayer(
      check,
      body.payerId,
      body.lineItemIds,
      existingPlan ?? undefined
    );
    return {
      allocationPlan: plan,
      closeValidation: container.agents.splitAgent.validateNoOrphanItems(check, plan),
      check: container.agents.checkAgent.buildGuestCheckSnapshot(check, plan)
    };
  });

  app.post("/public/sessions/:publicToken/allocations/fractional", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const body = z
      .object({
        lineItemId: z.string().min(1),
        checkVersion: z.number().int().positive(),
        shares: z
          .array(
            z.object({
              payerId: z.string().min(1),
              basisPoints: z.number().int().min(1).max(10000)
            })
          )
          .min(2)
          .refine(
            (shares) => shares.reduce((sum, share) => sum + share.basisPoints, 0) === 10000,
            { message: "shares must sum to exactly 10000 basis points" }
          )
      })
      .parse(request.body);
    const session = await resolveSessionFromToken(container, params.publicToken);
    const check = (await container.agents.checkAgent.refreshCheckSnapshot(
      container.restaurantConfig.posProviderKey,
      { ...buildContext(session.restaurantId, { type: "guest", id: "guest_split_fractional" }), restaurantId: session.restaurantId },
      session
    )).snapshot;
    container.agents.splitAgent.assertFreshCheckVersion(body.checkVersion, check);
    const existingPlan = await container.repositories.plans.findLatestBySession(session.id);
    const plan = await container.agents.splitAgent.fractionallyAllocateItem(
      check,
      body.lineItemId,
      body.shares,
      existingPlan ?? undefined
    );
    return {
      allocationPlan: plan,
      closeValidation: container.agents.splitAgent.validateNoOrphanItems(check, plan),
      check: container.agents.checkAgent.buildGuestCheckSnapshot(check, plan)
    };
  });

  app.post("/public/sessions/:publicToken/allocations/custom", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const body = z
      .object({
        payerId: z.string().min(1),
        checkVersion: z.number().int().positive(),
        amountCents: z.number().int().positive()
      })
      .parse(request.body);
    const session = await resolveSessionFromToken(container, params.publicToken);
    const check = (await container.agents.checkAgent.refreshCheckSnapshot(
      container.restaurantConfig.posProviderKey,
      { ...buildContext(session.restaurantId, { type: "guest", id: "guest_split_custom" }), restaurantId: session.restaurantId },
      session
    )).snapshot;
    container.agents.splitAgent.assertFreshCheckVersion(body.checkVersion, check);
    const existingPlan = await container.repositories.plans.findLatestBySession(session.id);
    const plan = await container.agents.splitAgent.customAllocateAmount(check, body.payerId, body.amountCents, existingPlan ?? undefined);
    return {
      allocationPlan: plan,
      closeValidation: container.agents.splitAgent.validateNoOrphanItems(check, plan),
      check: container.agents.checkAgent.buildGuestCheckSnapshot(check, plan)
    };
  });

  app.post("/public/sessions/:publicToken/payments/intents", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const body = z
      .object({
        payerId: z.string().min(1),
        allocationPlanId: z.string().min(1),
        checkVersion: z.number().int().positive(),
        amountCents: z.number().int().positive(),
        tipCents: z.number().int().min(0).default(0)
      })
      .parse(request.body);
    const session = await resolveSessionFromToken(container, params.publicToken);
    const check = (await container.agents.checkAgent.refreshCheckSnapshot(
      container.restaurantConfig.posProviderKey,
      { ...buildContext(session.restaurantId, { type: "guest", id: "guest_payment_intent" }), restaurantId: session.restaurantId },
      session
    )).snapshot;

    container.agents.splitAgent.assertFreshCheckVersion(body.checkVersion, check);

    const plan = await container.repositories.plans.findById(body.allocationPlanId);
    if (!plan) {
      throw new NotFoundError(`Allocation plan ${body.allocationPlanId} not found`);
    }

    const paymentAttempt = await container.agents.paymentAgent.createPaymentIntent({
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      context: { ...buildContext(session.restaurantId, { type: "guest", id: body.payerId }), restaurantId: session.restaurantId },
      sessionId: session.id,
      payerId: body.payerId,
      allocationPlan: plan,
      check,
      amountCents: body.amountCents,
      tipCents: body.tipCents
    });
    await syncSessionFromCheck(container, session, check);
    return {
      paymentAttempt,
      clientSecret: paymentAttempt.clientSecret
    };
  });

  app.post("/public/sessions/:publicToken/payments/:paymentAttemptId/capture", async (request) => {
    const params = z.object({ publicToken: z.string().min(1), paymentAttemptId: z.string().min(1) }).parse(request.params);
    const session = await resolveSessionFromToken(container, params.publicToken);
    const latestCheck = (await container.agents.checkAgent.refreshCheckSnapshot(
      container.restaurantConfig.posProviderKey,
      { ...buildContext(session.restaurantId, { type: "system", id: "pre_capture_refresh" }), restaurantId: session.restaurantId },
      session
    )).snapshot;

    const paymentAttempt = await container.agents.paymentAgent.capturePayment({
      paymentAttemptId: params.paymentAttemptId,
      paymentProviderKey: container.restaurantConfig.paymentProviderKey,
      posProviderKey: container.restaurantConfig.posProviderKey,
      posCheckId: latestCheck.posCheckId,
      currentCheckSnapshotId: latestCheck.id,
      currentCheckVersion: latestCheck.version,
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      context: { ...buildContext(session.restaurantId, { type: "guest", id: "guest_capture" }), restaurantId: session.restaurantId }
    });

    const refreshedCheck = (await container.agents.checkAgent.refreshCheckSnapshot(
      container.restaurantConfig.posProviderKey,
      { ...buildContext(session.restaurantId, { type: "system", id: "post_capture_refresh" }), restaurantId: session.restaurantId },
      session
    )).snapshot;
    const latestPlan = await container.repositories.plans.findLatestBySession(session.id);
    const normalizedCheck = container.agents.checkAgent.buildGuestCheckSnapshot(refreshedCheck, latestPlan);
    let updatedSession = await syncSessionFromCheck(container, session, normalizedCheck);
    let closeValidation = latestPlan
      ? container.agents.splitAgent.enforceCloseRules({
          check: normalizedCheck,
          plan: latestPlan,
          hasPendingPayments: (await container.repositories.paymentAttempts.listPendingBySession(session.id)).length > 0,
          hasBlockingMismatch: (await container.repositories.exceptions.listOpenBySession(session.id)).length > 0
        })
      : undefined;

    if (updatedSession.status === "fully_paid" && closeValidation?.canClose) {
      updatedSession = await container.agents.sessionAgent.closeSession(session.id, {
        publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
        supportRetentionDays: container.restaurantConfig.supportRetentionDays
      }, {
        actorType: "system",
        actorId: "payment_capture_close"
      });
    }

    return {
      paymentAttempt,
      check: normalizedCheck,
      session: updatedSession,
      closeValidation
    };
  });

  app.post("/public/sessions/:publicToken/order", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const body = z.object({
      lines: z.array(z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().positive().max(20).optional().default(1),
        modifiers: z.array(z.object({ type: z.string(), value: z.string() })).optional().default([]),
        notes: z.string().max(240).optional().default("")
      })).min(1).max(20)
    }).parse(request.body);
    const session = await resolveSessionFromToken(container, params.publicToken);
    for (const line of body.lines) {
      await container.agents.adminAgent.mutateSessionCheck({
        sessionId: session.id,
        posProviderKey: container.restaurantConfig.posProviderKey,
        mutation: { type: "add_menu_item", menuItemId: line.menuItemId, quantity: line.quantity },
        actor: { type: "guest", id: params.publicToken }
      });
    }
    return { ok: true, sessionId: session.id, orderCount: body.lines.length };
  });

  app.post("/public/sessions/:publicToken/loyalty", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const body = z.object({ phoneNumber: z.string().min(7), payerId: z.string().optional() }).parse(request.body);
    const session = await resolveSessionFromToken(container, params.publicToken);
    const profile = await container.agents.loyaltyAgent.attachLoyaltyToSession({
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      context: { ...buildContext(session.restaurantId, { type: "guest", id: body.payerId ?? "guest_loyalty" }), restaurantId: session.restaurantId },
      sessionId: session.id,
      payerId: body.payerId,
      phoneNumber: body.phoneNumber
    });
    return { profile };
  });

  app.post("/public/sessions/:publicToken/assist", async (request) => {
    const params = z.object({ publicToken: z.string().min(1) }).parse(request.params);
    const session = await resolveSessionFromToken(container, params.publicToken);
    container.assistRequests.set(session.id, true);
    return { ok: true, sessionId: session.id, assistRequested: true };
  });

  if (runtime?.jwtSecret) {
    app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.url.startsWith("/admin/")) return;
      const token = extractBearerToken(request.headers.authorization);
      if (!token) {
        return reply.code(401).send({ error: "UNAUTHORIZED", message: "Missing Authorization header" });
      }
      try {
        const payload = verifyJwt(token, runtime.jwtSecret!);
        if (payload.role !== "restaurant_admin") {
          return reply.code(403).send({ error: "FORBIDDEN", message: "Admin access required" });
        }
        request.adminPayload = payload;
      } catch (err) {
        if (err instanceof JwtVerificationError) {
          return reply.code(401).send({ error: "UNAUTHORIZED", message: err.message });
        }
        throw err;
      }
    });
  }

  app.get("/admin/restaurants/:restaurantId/overview", async (request) => {
      const params = z.object({ restaurantId: z.string().min(1) }).parse(request.params);
      return container.agents.adminAgent.getRestaurantOverview(params.restaurantId);
    });

  app.get("/admin/restaurants/:restaurantId/tables", async (request) => {
      const params = z.object({ restaurantId: z.string().min(1) }).parse(request.params);
      const overview = await container.agents.adminAgent.getRestaurantOverview(params.restaurantId);
      const activeTables = await Promise.all(
        overview.tables.map(async (table) => {
          const session = table.sessionId
            ? await container.repositories.sessions.findById(table.sessionId)
            : null;
          return {
            ...table,
            assistRequested: table.sessionId ? container.assistRequests.get(table.sessionId) === true : false,
            openedAt: session?.openedAt ?? undefined
          };
        })
      );
      const activeTableIds = new Set(activeTables.map((t) => t.tableId));
      const totalTables = container.restaurantConfig.tableCount ?? 12;
      const emptyTables = Array.from({ length: totalTables }, (_, i) => `table_${i + 1}`)
        .filter((tableId) => !activeTableIds.has(tableId))
        .map((tableId) => ({
          tableId,
          tableLabel: `Table ${tableId.replace("table_", "")}`,
          sessionId: undefined,
          sessionStatus: "empty" as const,
          publicAccessAllowed: false,
          supportAccessAllowed: false,
          remainingBalanceCents: 0,
          openExceptionCount: 0,
          payerCompletionCount: 0,
          totalPayerCount: 0,
          updatedAt: new Date().toISOString(),
          assistRequested: false
        }));
      const allTables = [...activeTables, ...emptyTables].sort((a, b) => {
        const numA = parseInt(a.tableId.replace("table_", ""), 10);
        const numB = parseInt(b.tableId.replace("table_", ""), 10);
        return numA - numB;
      });
      return {
        restaurantId: overview.restaurantId,
        tables: allTables
      };
    });

  app.post("/admin/restaurants/:restaurantId/sessions/:sessionId/assist", async (request) => {
      const params = z.object({ restaurantId: z.string().min(1), sessionId: z.string().min(1) }).parse(request.params);
      const session = await container.repositories.sessions.findById(params.sessionId);
      if (!session || session.restaurantId !== params.restaurantId) {
        throw new NotFoundError(`Session ${params.sessionId} not found for restaurant ${params.restaurantId}`);
      }

      container.assistRequests.set(params.sessionId, true);
      return { ok: true, sessionId: params.sessionId, assistRequested: true };
    });

  app.delete("/admin/restaurants/:restaurantId/sessions/:sessionId/assist", async (request) => {
      const params = z.object({ restaurantId: z.string().min(1), sessionId: z.string().min(1) }).parse(request.params);
      const session = await container.repositories.sessions.findById(params.sessionId);
      if (!session || session.restaurantId !== params.restaurantId) {
        throw new NotFoundError(`Session ${params.sessionId} not found for restaurant ${params.restaurantId}`);
      }

      container.assistRequests.delete(params.sessionId);
      return { ok: true, sessionId: params.sessionId, assistRequested: false };
    });

  app.get("/admin/restaurants/:restaurantId/sessions", async (request) => {
      const params = z.object({ restaurantId: z.string().min(1) }).parse(request.params);
      return container.agents.adminAgent.viewSessionHistory(params.restaurantId);
    });

  app.get("/admin/restaurants/:restaurantId/sessions/:sessionId", async (request) => {
      const params = z.object({ restaurantId: z.string().min(1), sessionId: z.string().min(1) }).parse(request.params);
      const detail = await container.agents.adminAgent.getSessionDetail(params.sessionId);
      if (detail.session.restaurantId !== params.restaurantId) {
        throw new NotFoundError(`Session ${params.sessionId} not found for restaurant ${params.restaurantId}`);
      }

      return detail;
    });

  app.get("/admin/restaurants/:restaurantId/exceptions", async (request) => {
      const params = z.object({ restaurantId: z.string().min(1) }).parse(request.params);
      return {
        restaurantId: params.restaurantId,
        exceptions: await container.agents.adminAgent.listOpenExceptions(params.restaurantId)
      };
    });

  app.post("/admin/exceptions/:exceptionId/resolve", async (request) => {
      const params = z.object({ exceptionId: z.string().min(1) }).parse(request.params);
      await container.agents.adminAgent.resolveSyncException(params.exceptionId);
      return { ok: true };
    });

  app.get("/admin/restaurants/:restaurantId/flags", async (request) => {
      const params = z.object({ restaurantId: z.string().min(1) }).parse(request.params);
      const flags = container.featureFlags.get(params.restaurantId) ?? {};
      return { restaurantId: params.restaurantId, flags };
    });

  app.post("/admin/restaurants/:restaurantId/flags", async (request) => {
      const params = z.object({ restaurantId: z.string().min(1) }).parse(request.params);
      const body = z.object({ flags: z.record(z.boolean()) }).parse(request.body);
      const existing = container.featureFlags.get(params.restaurantId) ?? {};
      const merged = { ...existing, ...body.flags };
      container.featureFlags.set(params.restaurantId, merged);
      return { ok: true, restaurantId: params.restaurantId, flags: merged };
    });

  app.post("/admin/sessions/:sessionId/clear", async (request) => {
      const params = z.object({ sessionId: z.string().min(1) }).parse(request.params);
      const actor = request.adminPayload
        ? { type: "restaurant_admin" as const, id: request.adminPayload.sub }
        : { type: "restaurant_admin" as const, id: "admin_demo" };
      await container.agents.adminAgent.markTableCleared(params.sessionId, actor);
      return { ok: true };
    });

  app.post("/admin/sessions/:sessionId/close", async (request) => {
      const params = z.object({ sessionId: z.string().min(1) }).parse(request.params);
      const adminId = request.adminPayload?.sub ?? "admin_demo";
      const session = await container.repositories.sessions.findById(params.sessionId);
      if (!session) {
        throw new NotFoundError(`Session ${params.sessionId} not found`);
      }

      const refreshed = (await container.agents.checkAgent.refreshCheckSnapshot(
        container.restaurantConfig.posProviderKey,
        { ...buildContext(session.restaurantId, { type: "restaurant_admin", id: adminId }), restaurantId: session.restaurantId },
        session
      )).snapshot;
      const latestPlan = await container.repositories.plans.findLatestBySession(session.id);
      const closeValidation = latestPlan
        ? container.agents.splitAgent.enforceCloseRules({
            check: container.agents.checkAgent.buildGuestCheckSnapshot(refreshed, latestPlan),
            plan: latestPlan,
            hasPendingPayments: (await container.repositories.paymentAttempts.listPendingBySession(session.id)).length > 0,
            hasBlockingMismatch: (await container.repositories.exceptions.listOpenBySession(session.id)).length > 0
          })
        : {
            canClose: refreshed.remainingBalanceCents <= 1 && refreshed.assignmentSummary.unassignedLineItemIds.length === 0,
            reasons: [
              ...(refreshed.remainingBalanceCents <= 1 ? [] : ["Remaining balance exceeds tolerance"]),
              ...(refreshed.assignmentSummary.unassignedLineItemIds.length === 0 ? [] : ["Unassigned payable items remain"])
            ],
            unassignedLineItemIds: refreshed.assignmentSummary.unassignedLineItemIds,
            remainingBalanceCents: refreshed.remainingBalanceCents,
            toleranceExceededByCents: Math.max(refreshed.remainingBalanceCents - 1, 0)
          };

      if (!closeValidation.canClose) {
        throw new DomainError("Session cannot close until close validation passes", "SESSION_CLOSE_BLOCKED", 409);
      }

      const closed = await container.agents.sessionAgent.closeSession(params.sessionId, {
        publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
        supportRetentionDays: container.restaurantConfig.supportRetentionDays
      }, {
        actorType: "restaurant_admin",
        actorId: adminId
      });
      return {
        session: closed,
        closeValidation
      };
    });

  app.post("/admin/sessions/:sessionId/items", async (request) => {
      const params = z.object({ sessionId: z.string().min(1) }).parse(request.params);
      const body = z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().positive().max(10).optional()
      }).parse(request.body);
      const adminId = request.adminPayload?.sub ?? "admin_demo";

      const detail = await container.agents.adminAgent.mutateSessionCheck({
        sessionId: params.sessionId,
        posProviderKey: container.restaurantConfig.posProviderKey,
        mutation: {
          type: "add_menu_item",
          menuItemId: body.menuItemId,
          quantity: body.quantity
        },
        actor: { type: "restaurant_admin", id: adminId }
      });

      return {
        ok: true,
        detail
      };
    });

  app.post("/admin/sessions/:sessionId/credits", async (request) => {
      const params = z.object({ sessionId: z.string().min(1) }).parse(request.params);
      const body = z.object({
        amountCents: z.number().int().positive(),
        label: z.string().min(1).max(120).optional()
      }).parse(request.body);
      const adminId = request.adminPayload?.sub ?? "admin_demo";

      const detail = await container.agents.adminAgent.mutateSessionCheck({
        sessionId: params.sessionId,
        posProviderKey: container.restaurantConfig.posProviderKey,
        mutation: {
          type: "apply_credit",
          amountCents: body.amountCents,
          label: body.label
        },
        actor: { type: "restaurant_admin", id: adminId }
      });

      return {
        ok: true,
        detail
      };
    });

  app.post("/admin/sessions/:sessionId/lines/:lineId/void", async (request) => {
      const params = z.object({ sessionId: z.string().min(1), lineId: z.string().min(1) }).parse(request.params);
      const body = z.object({
        reason: z.string().min(1).max(240).optional()
      }).parse(request.body ?? {});
      const adminId = request.adminPayload?.sub ?? "admin_demo";

      const detail = await container.agents.adminAgent.mutateSessionCheck({
        sessionId: params.sessionId,
        posProviderKey: container.restaurantConfig.posProviderKey,
        mutation: {
          type: "void_line_item",
          lineItemId: params.lineId,
          reason: body.reason
        },
        actor: { type: "restaurant_admin", id: adminId }
      });

      return {
        ok: true,
        detail
      };
    });

  app.post("/webhooks/square", { config: { rawBody: true } }, async (request, reply) => {
    const payload: string = Buffer.isBuffer(request.rawBody)
      ? (request.rawBody as Buffer).toString("utf8")
      : ((request.rawBody as string | undefined) ?? (typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {})));
    const signatureHeader = Array.isArray(request.headers["x-square-hmacsha256-signature"])
      ? request.headers["x-square-hmacsha256-signature"][0]
      : request.headers["x-square-hmacsha256-signature"];
    const origin =
      runtime?.apiBaseUrl ??
      `${request.protocol}://${request.headers.host ?? "localhost:4000"}`;
    const parsed = parseSquareWebhookEvent({
      notificationUrl: `${origin}/webhooks/square`,
      payload,
      signatureHeader,
      signatureKey: runtime?.squareWebhookSignatureKey
    });

    if (!parsed.ok) {
      return reply.code(400).send({
        error: parsed.errorCode,
        message: parsed.errorMessage
      });
    }

    return {
      ok: true,
      verified: true,
      eventId: parsed.event.event_id,
      eventType: parsed.event.type,
      mapped: parsed.mapped,
      todo: "Persist Square webhook idempotently and correlate order/payment events to sessions."
    };
  });

  app.post("/webhooks/stripe", { config: { rawBody: true } }, async (request, reply) => {
    const payload: string = Buffer.isBuffer(request.rawBody)
      ? (request.rawBody as Buffer).toString("utf8")
      : ((request.rawBody as string | undefined) ?? (typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {})));
    const signatureHeader = Array.isArray(request.headers["stripe-signature"])
      ? request.headers["stripe-signature"][0]
      : request.headers["stripe-signature"];
    const parsed = parseStripeWebhookEvent({
      payload,
      signatureHeader,
      webhookSecret: runtime?.stripeWebhookSecret
    });

    if (!parsed.ok) {
      return reply.code(400).send({
        error: parsed.errorCode,
        message: parsed.errorMessage
      });
    }

    const knownAttempt =
      parsed.mapped.paymentIntentId
        ? await container.repositories.paymentAttempts.findByProviderPaymentIntentId("stripe", parsed.mapped.paymentIntentId)
        : null;
    const knownSession = knownAttempt ? await container.repositories.sessions.findById(knownAttempt.sessionId) : null;
    const latestCheck =
      knownAttempt && knownSession
        ? await container.repositories.checks.findLatestBySession(knownSession.id)
        : null;
    const handled = await container.agents.paymentAgent.handleStripeWebhook({
      paymentIntentId: parsed.mapped.paymentIntentId,
      chargeId: parsed.mapped.chargeId,
      internalState: parsed.mapped.internalState,
      posProviderKey: container.restaurantConfig.posProviderKey,
      loyaltyProviderKey: container.restaurantConfig.loyaltyProviderKey,
      posCheckId: latestCheck?.posCheckId,
      context: {
        correlationId: `stripe:${parsed.event.id}`,
        restaurantId: knownSession?.restaurantId ?? container.restaurantConfig.id,
        actor: {
          type: "provider_webhook",
          id: "stripe"
        }
      },
      eventId: parsed.event.id,
      eventType: parsed.event.type
    });

    return {
      ok: true,
      verified: true,
      eventId: parsed.event.id,
      eventType: parsed.event.type,
      mapped: parsed.mapped,
      handled: handled.handled,
      reason: handled.reason,
      paymentAttemptId: handled.paymentAttempt?.id,
      paymentStatus: handled.paymentAttempt?.status
    };
  });
}

export function attachErrorHandler(app: FastifyInstance<any, any, any, any>) {
  app.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof DomainError) {
      app.log.warn({ traceId: request.traceId, code: error.code }, error.message);
      void reply.code(error.statusCode).send({
        error: error.code,
        message: error.message
      });
      return;
    }

    log.error(
      {
        traceId: request.traceId,
        path: request.url,
        method: request.method,
        statusCode: 500,
        errorMessage: error.message,
        stack: error.stack
      },
      "unhandled error"
    );
    void reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: error.message
    });
  });
}
