import type { CorrelationContext, MenuItem, MenuSnapshot } from "@taps/contracts";
import type { AuditRepository } from "../repositories";
import { PosIntegrationAgent } from "../pos/pos-integration-agent";

interface CacheEntry {
  menu: MenuSnapshot;
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 60_000; // 60 seconds — satisfies <2s tap-to-render requirement

export class MenuAgent {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly posAgent: PosIntegrationAgent,
    private readonly audit: AuditRepository,
    private readonly cacheTtlMs: number = DEFAULT_CACHE_TTL_MS
  ) {}

  async fetchMenu(posProviderKey: string, context: CorrelationContext): Promise<MenuSnapshot> {
    const cacheKey = `${context.restaurantId}:${posProviderKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.menu;
    }

    const menu = await this.posAgent.fetchMenu(posProviderKey, context);
    const normalized = this.normalizeMenu(menu);

    this.cache.set(cacheKey, { menu: normalized, expiresAt: Date.now() + this.cacheTtlMs });

    await this.audit.record({
      id: crypto.randomUUID(),
      restaurantId: context.restaurantId,
      actorType: context.actor.type,
      actorId: context.actor.id,
      action: "menu.fetched",
      subjectType: "menu_snapshot",
      subjectId: normalized.id,
      correlationId: context.correlationId,
      createdAt: new Date().toISOString()
    });
    return normalized;
  }

  invalidateCache(restaurantId: string, posProviderKey: string): void {
    this.cache.delete(`${restaurantId}:${posProviderKey}`);
  }

  normalizeMenu(snapshot: MenuSnapshot): MenuSnapshot {
    const items = snapshot.items
      .map((item) => this.attachModifiers(item))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      ...snapshot,
      items,
      categories: [...snapshot.categories].sort((left, right) => left.sortOrder - right.sortOrder)
    };
  }

  private attachModifiers(item: MenuItem): MenuItem {
    return {
      ...item,
      modifiers: item.modifiers.map((group) => ({
        ...group,
        options: group.options.sort((left, right) => left.name.localeCompare(right.name))
      })),
      addOns: item.addOns.map((group) => ({
        ...group,
        options: group.options.sort((left, right) => left.name.localeCompare(right.name))
      }))
    };
  }
}
