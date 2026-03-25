import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/bootstrap/create-app";

function parseJson<T>(payload: string): T {
  return JSON.parse(payload) as T;
}

describe("Admin ops routes", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("returns overview and session detail shaped for the admin frontend", async () => {
    const created = await createApp(undefined, {
      dataStoreDriver: "memory",
      queueDriver: "memory"
    });
    app = created.app;

    const tapResponse = await app.inject({
      method: "POST",
      url: "/public/taps/demo-table-test/session"
    });
    const tapBody = parseJson<{
      access: { session: { id: string; publicToken: string } };
      check: { version: number };
    }>(tapResponse.payload);

    await app.inject({
      method: "POST",
      url: `/public/sessions/${tapBody.access.session.publicToken}/payers`,
      payload: {
        displayName: "Alex"
      }
    });

    const overviewResponse = await app.inject({
      method: "GET",
      url: "/admin/restaurants/rest_demo/overview"
    });
    expect(overviewResponse.statusCode).toBe(200);
    const overviewBody = parseJson<{
      restaurantId: string;
      tableCount: number;
      sessions: Array<{ session: { id: string } }>;
      tables: Array<{ sessionId?: string }>;
    }>(overviewResponse.payload);
    expect(overviewBody.restaurantId).toBe("rest_demo");
    expect(overviewBody.tableCount).toBeGreaterThanOrEqual(1);
    const tappedTable = overviewBody.tables.find((t) => t.sessionId === tapBody.access.session.id);
    expect(tappedTable?.sessionId).toBe(tapBody.access.session.id);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/admin/restaurants/rest_demo/sessions/${tapBody.access.session.id}`
    });
    expect(detailResponse.statusCode).toBe(200);
    const detailBody = parseJson<{
      session: { id: string };
      check?: { version: number };
      settlement?: { remainingBalanceCents: number };
      payers: Array<{ displayName: string }>;
    }>(detailResponse.payload);
    expect(detailBody.session.id).toBe(tapBody.access.session.id);
    expect(detailBody.check?.version).toBe(tapBody.check.version);
    expect(detailBody.settlement?.remainingBalanceCents).toBeGreaterThanOrEqual(0);
    expect(detailBody.payers[0]?.displayName).toBe("Alex");
  });
});
