import { describe, expect, it } from "vitest";
import { createContainer } from "../../apps/api/src/bootstrap/create-container";
import { newId } from "../../apps/api/src/lib/idempotency";

/**
 * Session token rotation:
 *   When a guest taps an NFC tag after a session has been closed/expired,
 *   a new session is created with a fresh public token.
 *   The old public token must be rejected.
 */
describe("Session token rotation on re-tap", () => {
  async function createAndCloseSession(container: ReturnType<typeof createContainer>) {
    const context = {
      correlationId: newId("corr"),
      restaurantId: container.restaurantConfig.id,
      actor: { type: "system" as const, id: "test_closer" }
    };

    const session = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      context,
      {
        publicGraceMinutes: 0, // immediate expiry on close
        supportRetentionDays: 30
      }
    );

    await container.agents.sessionAgent.syncSettlementState(session.id, {
      amountPaidCents: 5400,
      remainingBalanceCents: 0,
      hasPendingPayments: false
    });

    await container.agents.sessionAgent.closeSession(session.id, {
      publicGraceMinutes: 0,
      supportRetentionDays: 30
    });

    return session;
  }

  it("rejects the old public token after a session is closed", async () => {
    const container = createContainer();
    const oldSession = await createAndCloseSession(container);

    const access = await container.agents.sessionAgent.validatePublicAccess(oldSession.publicToken);
    expect(access.publicAccessAllowed).toBe(false);
  });

  it("creates a new session with a different public token on re-tap", async () => {
    const container = createContainer();
    const oldSession = await createAndCloseSession(container);

    // Simulate the table being cleared so a new session can start
    await container.repositories.sessions.save({
      ...oldSession,
      status: "cleared_locked",
      updatedAt: new Date().toISOString(),
      version: oldSession.version + 1
    });

    const newSession = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      {
        correlationId: newId("corr"),
        restaurantId: container.restaurantConfig.id,
        actor: { type: "guest" as const, id: "new_guest" }
      },
      {
        publicGraceMinutes: 15,
        supportRetentionDays: 30
      }
    );

    expect(newSession.publicToken).not.toBe(oldSession.publicToken);
    expect(newSession.id).not.toBe(oldSession.id);
  });

  it("new session public token passes access validation", async () => {
    const container = createContainer();
    const oldSession = await createAndCloseSession(container);

    await container.repositories.sessions.save({
      ...oldSession,
      status: "cleared_locked",
      updatedAt: new Date().toISOString(),
      version: oldSession.version + 1
    });

    const newSession = await container.agents.sessionAgent.createSession(
      "demo-table-12",
      container.restaurantConfig.posProviderKey,
      {
        correlationId: newId("corr"),
        restaurantId: container.restaurantConfig.id,
        actor: { type: "guest" as const, id: "new_guest" }
      },
      {
        publicGraceMinutes: 15,
        supportRetentionDays: 30
      }
    );

    const newAccess = await container.agents.sessionAgent.validatePublicAccess(newSession.publicToken);
    expect(newAccess.publicAccessAllowed).toBe(true);
  });

  it("old token returns SESSION_EXPIRED reason after expiry worker runs", async () => {
    const container = createContainer();
    const session = await createAndCloseSession(container);

    // Mark public access as expired (simulating expiry worker)
    await container.agents.sessionAgent.expirePublicAccess(session.id);

    const access = await container.agents.sessionAgent.validatePublicAccess(session.publicToken);
    expect(access.publicAccessAllowed).toBe(false);
    expect(access.reason).toMatch(/expired|closed/i);
  });
});
