import { AdminShell } from "../../../../../components/admin-shell";
import { FeatureFlagsPanel } from "../../../../../components/feature-flags-panel";
import { fetchRestaurantFlags } from "../../../../../lib/api-client";

export default async function FeatureFlagsPage(props: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await props.params;
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
    >
      <FeatureFlagsPanel restaurantId={restaurantId} initialFlags={initialFlags} />
    </AdminShell>
  );
}
