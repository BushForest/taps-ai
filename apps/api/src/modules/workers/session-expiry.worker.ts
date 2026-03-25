import type { AppContainer } from "../../bootstrap/create-container";

export async function runSessionExpiryWorker(container: AppContainer): Promise<number> {
  let processed = 0;
  const expirable = await container.repositories.sessions.listExpirable(new Date().toISOString());

  for (const session of expirable) {
    await container.agents.sessionAgent.expirePublicAccess(session.id, {
      actorType: "system",
      actorId: "session_expiry_worker"
    });
    processed += 1;
  }

  const archivable = await container.repositories.sessions.listArchivable(new Date().toISOString());

  for (const session of archivable) {
    await container.agents.sessionAgent.archiveSession(session.id, {
      actorType: "system",
      actorId: "session_expiry_worker"
    });
    processed += 1;
  }

  return processed;
}
