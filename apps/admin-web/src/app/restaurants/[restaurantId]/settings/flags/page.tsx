import { cookies } from "next/headers";
import { AdminShell } from "../../../../../components/admin-shell";
import { FeatureFlagsPanel } from "../../../../../components/feature-flags-panel";
import { fetchRestaurantFlags } from "../../../../../lib/api-client";
import { getRoleFromCookie } from "../../../../../lib/auth";

export default async function FeatureFlagsPage(props: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await props.params;
  const role = getRoleFromCookie(await cookies());
  let initialFlags: Record<string, boolean> = {};
  try {
    const result = await fetchRestaurantFlags(restaurantId);
    initialFlags = result.flags ?? {};
  } catch {
    // show empty state, panel will retry
  }

  return (
    <AdminShell
      title="Feature Flags"
      subtitle="Toggle capabilities on and off for this restaurant in real time."
      restaurantId={restaurantId}
      role={role ?? undefined}
    >
      <FeatureFlagsPanel restaurantId={restaurantId} initialFlags={initialFlags} />
    </AdminShell>
  );
}
