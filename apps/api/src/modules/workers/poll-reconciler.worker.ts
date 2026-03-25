import type { AppContainer } from "../../bootstrap/create-container";

export async function runPollReconcilerWorker(container: AppContainer, sessionId: string) {
  const session = await container.repositories.sessions.findById(sessionId);
  if (!session) {
    return {
      sessionId,
      openExceptions: 0,
      detectedClosed: false,
      changedLineIds: []
    };
  }

  const latestCheck = await container.repositories.checks.findLatestBySession(sessionId);
  const exceptions = await container.repositories.exceptions.listOpenBySession(sessionId);
  const context = {
    correlationId: `poll_${sessionId}`,
    restaurantId: session.restaurantId,
    actor: {
      type: "system" as const,
      id: "poll_reconciler"
    }
  };
  const closedState = await container.agents.posAgent.detectClosedCheck(container.restaurantConfig.posProviderKey, context, {
    tableId: session.tableId,
    sessionId,
    posCheckId: latestCheck?.posCheckId
  });
  const voidSync = await container.agents.posAgent.syncVoidsAndCancels(container.restaurantConfig.posProviderKey, context, {
    tableId: session.tableId,
    sessionId,
    posCheckId: latestCheck?.posCheckId
  });
  return {
    sessionId,
    openExceptions: exceptions.length,
    detectedClosed: closedState.isClosed,
    changedLineIds: voidSync.changedLineIds
  };
}
