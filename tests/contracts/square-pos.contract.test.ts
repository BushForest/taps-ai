import { describe, expect, it } from "vitest";
import { createSquarePosProvider } from "@taps/mcp";

describe("Square POS adapter contract", () => {
  const provider = createSquarePosProvider();
  const baseRequest = {
    provider: "square",
    version: "1",
    timeoutMs: 1000,
    context: {
      correlationId: "corr_1",
      restaurantId: "rest_demo",
      actor: {
        type: "system" as const,
        id: "contract_test"
      }
    }
  };

  it("surfaces unimplemented status consistently until live wiring is added", async () => {
    const menuResult = await provider.fetchMenu.execute({
      ...baseRequest,
      action: "fetch_menu_from_pos",
      input: { restaurantId: "rest_demo" }
    });

    expect(menuResult.ok).toBe(false);
    expect(menuResult.errorCode).toBe("MISSING_PROVIDER_CONFIG");
  });
});
