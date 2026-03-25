import { describe, expect, it } from "vitest";
import { createContainer } from "../../apps/api/src/bootstrap/create-container";
import { newId } from "../../apps/api/src/lib/idempotency";
import { runSessionExpiryWorker } from "../../apps/api/src/modules/workers/session-expiry.worker";

describe("Table session lifecycle", () => {
  it("keeps an active session publicly accessible until it is closed", async () => {
    const container = createContainer();
    const session = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      {
        correlationId: newId("corr"),
        restaurantId: container.restaurantConfig.id,
        actor: {
          type: "guest",
          id: "guest_demo"
        }
      },
      {
        publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
        supportRetentionDays: container.restaurantConfig.supportRetentionDays
      }
    );

    const access = await container.agents.sessionAgent.validatePublicAccess(session.publicToken);

    expect(session.publicExpiresAt).toBeUndefined();
    expect(access.publicAccessAllowed).toBe(true);
  });

  it("sets public and audit expiry windows when a fully paid session closes", async () => {
    const container = createContainer();
    const session = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      {
        correlationId: newId("corr"),
        restaurantId: container.restaurantConfig.id,
        actor: {
          type: "system",
          id: "closer"
        }
      },
      {
        publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
        supportRetentionDays: container.restaurantConfig.supportRetentionDays
      }
    );

    await container.agents.sessionAgent.syncSettlementState(session.id, {
      amountPaidCents: 5400,
      remainingBalanceCents: 0,
      hasPendingPayments: false
    });

    const closed = await container.agents.sessionAgent.closeSession(session.id, {
      publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
      supportRetentionDays: container.restaurantConfig.supportRetentionDays
    });

    expect(closed.status).toBe("closed");
    expect(closed.publicExpiresAt).toBeTruthy();
    expect(closed.auditExpiresAt).toBeTruthy();
    expect(await container.jobs.listQueued("session.expire_public_access")).toHaveLength(1);
    expect(await container.jobs.listQueued("session.archive")).toHaveLength(1);
  });

  it("transitions through payment_in_progress, partially_paid, and fully_paid as settlement state changes", async () => {
    const container = createContainer();
    const session = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      {
        correlationId: newId("corr"),
        restaurantId: container.restaurantConfig.id,
        actor: {
          type: "guest",
          id: "guest_demo"
        }
      },
      {
        publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
        supportRetentionDays: container.restaurantConfig.supportRetentionDays
      }
    );

    const pending = await container.agents.sessionAgent.syncSettlementState(session.id, {
      amountPaidCents: 0,
      remainingBalanceCents: 5400,
      hasPendingPayments: true
    });
    const partial = await container.agents.sessionAgent.syncSettlementState(session.id, {
      amountPaidCents: 1200,
      remainingBalanceCents: 4200,
      hasPendingPayments: false
    });
    const full = await container.agents.sessionAgent.syncSettlementState(session.id, {
      amountPaidCents: 5400,
      remainingBalanceCents: 0,
      hasPendingPayments: false
    });

    expect(pending.status).toBe("payment_in_progress");
    expect(partial.status).toBe("partially_paid");
    expect(full.status).toBe("fully_paid");
  });

  it("immediately blocks public access when a table is manually cleared", async () => {
    const container = createContainer();
    const session = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      {
        correlationId: newId("corr"),
        restaurantId: container.restaurantConfig.id,
        actor: {
          type: "restaurant_admin",
          id: "admin_demo"
        }
      },
      {
        publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
        supportRetentionDays: container.restaurantConfig.supportRetentionDays
      }
    );

    await container.agents.adminAgent.markTableCleared(session.id, {
      type: "restaurant_admin",
      id: "admin_demo"
    });

    const clearedSession = await container.repositories.sessions.findById(session.id);
    const access = await container.agents.sessionAgent.validatePublicAccess(session.publicToken);

    expect(clearedSession?.status).toBe("cleared_locked");
    expect(access.publicAccessAllowed).toBe(false);
    expect(access.reason).toBe("cleared");
    expect(await container.jobs.listQueued("session.archive")).toHaveLength(1);
  });

  it("archives expired support records after the audit retention window", async () => {
    const container = createContainer();
    const session = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      {
        correlationId: newId("corr"),
        restaurantId: container.restaurantConfig.id,
        actor: {
          type: "system",
          id: "worker"
        }
      },
      {
        publicGraceMinutes: container.restaurantConfig.publicGraceMinutes,
        supportRetentionDays: container.restaurantConfig.supportRetentionDays
      }
    );

    await container.repositories.sessions.save({
      ...session,
      status: "public_expired",
      closedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      publicExpiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      auditExpiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      version: session.version + 1,
      updatedAt: new Date().toISOString()
    });

    await runSessionExpiryWorker(container);

    const archived = await container.repositories.sessions.findById(session.id);
    expect(archived?.status).toBe("archived");
  });
});
