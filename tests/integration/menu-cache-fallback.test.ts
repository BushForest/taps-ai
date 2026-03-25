import { describe, expect, it } from "vitest";
import { MenuAgent } from "../../apps/api/src/modules/menu/menu-agent";
import { newId } from "../../apps/api/src/lib/idempotency";
import type { MenuSnapshot } from "@taps/contracts";

function makeContext(restaurantId = "rest_demo") {
  return {
    correlationId: newId("corr"),
    restaurantId,
    actor: { type: "guest" as const, id: "guest_demo" }
  };
}

function makeFakeMenu(restaurantId = "rest_demo"): MenuSnapshot {
  return {
    id: `menu_${newId("menu")}`,
    restaurantId,
    source: "mirror" as const,
    sourceVersion: "v1",
    currency: "USD" as const,
    categories: [{ id: "cat_1", name: "Mains", sortOrder: 1 }],
    items: [],
    fetchedAt: new Date().toISOString(),
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

describe("MenuAgent in-memory cache", () => {
  it("returns a cached menu without calling the POS on the second request", async () => {
    let posCallCount = 0;
    const fakeMenu = makeFakeMenu();

    const fakePosAgent = {
      fetchMenu: async () => {
        posCallCount++;
        return fakeMenu;
      }
    } as never;

    const agent = new MenuAgent(fakePosAgent, { record: async () => {} } as never, 60_000);
    const context = makeContext();

    await agent.fetchMenu("memory", context);
    await agent.fetchMenu("memory", context); // second call — should hit cache

    expect(posCallCount).toBe(1);
  });

  it("re-fetches from POS after cache TTL expires", async () => {
    let posCallCount = 0;

    const fakePosAgent = {
      fetchMenu: async () => {
        posCallCount++;
        return makeFakeMenu();
      }
    } as never;

    // 1ms TTL — expires immediately
    const agent = new MenuAgent(fakePosAgent, { record: async () => {} } as never, 1);
    const context = makeContext();

    await agent.fetchMenu("memory", context);
    await new Promise((resolve) => setTimeout(resolve, 5)); // wait for TTL to expire
    await agent.fetchMenu("memory", context);

    expect(posCallCount).toBe(2);
  });

  it("serves stale cache for one restaurant while re-fetching for another", async () => {
    let calls: string[] = [];

    const fakePosAgent = {
      fetchMenu: async (_key: string, ctx: { restaurantId: string }) => {
        calls.push(ctx.restaurantId);
        return makeFakeMenu(ctx.restaurantId);
      }
    } as never;

    const agent = new MenuAgent(fakePosAgent, { record: async () => {} } as never, 60_000);

    await agent.fetchMenu("memory", makeContext("rest_a"));
    await agent.fetchMenu("memory", makeContext("rest_b"));
    await agent.fetchMenu("memory", makeContext("rest_a")); // cached
    await agent.fetchMenu("memory", makeContext("rest_b")); // cached

    expect(calls).toEqual(["rest_a", "rest_b"]); // only 2 POS calls total
  });

  it("invalidates cache and re-fetches on next call after invalidateCache", async () => {
    let posCallCount = 0;

    const fakePosAgent = {
      fetchMenu: async () => {
        posCallCount++;
        return makeFakeMenu();
      }
    } as never;

    const agent = new MenuAgent(fakePosAgent, { record: async () => {} } as never, 60_000);
    const context = makeContext();

    await agent.fetchMenu("memory", context); // populates cache
    agent.invalidateCache(context.restaurantId, "memory");
    await agent.fetchMenu("memory", context); // cache invalidated — must re-fetch

    expect(posCallCount).toBe(2);
  });

  it("returns the cached menu even when the POS becomes unavailable mid-session", async () => {
    const fakeMenu = makeFakeMenu();
    let posAvailable = true;

    const fakePosAgent = {
      fetchMenu: async () => {
        if (!posAvailable) throw new Error("POS unavailable");
        return fakeMenu;
      }
    } as never;

    const agent = new MenuAgent(fakePosAgent, { record: async () => {} } as never, 60_000);
    const context = makeContext();

    await agent.fetchMenu("memory", context); // populates cache
    posAvailable = false; // POS goes down

    // Should serve from cache without throwing
    const result = await agent.fetchMenu("memory", context);
    expect(result.id).toBe(fakeMenu.id);
  });
});
