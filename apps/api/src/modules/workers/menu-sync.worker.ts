import type { AppContainer } from "../../bootstrap/create-container";

export async function runMenuSyncWorker(container: AppContainer) {
  return container.agents.menuAgent.fetchMenu(container.restaurantConfig.posProviderKey, {
    correlationId: crypto.randomUUID(),
    restaurantId: container.restaurantConfig.id,
    actor: {
      type: "system",
      id: "menu_sync_worker"
    }
  });
}
