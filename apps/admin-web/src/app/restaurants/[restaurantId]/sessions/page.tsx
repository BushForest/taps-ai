import { AdminShell } from "../../../../components/admin-shell";
import { SessionList } from "../../../../components/session-list";
import { fetchRestaurantTables } from "../../../../lib/api-client";

export default async function SessionsPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  const { tables } = await fetchRestaurantTables(restaurantId);

  return (
    <AdminShell restaurantId={restaurantId} activeTab="sessions">
      <SessionList restaurantId={restaurantId} tables={tables} />
    </AdminShell>
  );
}
