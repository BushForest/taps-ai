import { cookies } from "next/headers";
import { AdminShell } from "../../../../components/admin-shell";
import { SessionList } from "../../../../components/session-list";
import { fetchRestaurantTables } from "../../../../lib/api-client";
import { getRoleFromCookie } from "../../../../lib/auth";

export default async function SessionsPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  const role = getRoleFromCookie(await cookies());
  const { tables } = await fetchRestaurantTables(restaurantId);

  return (
    <AdminShell restaurantId={restaurantId} activeTab="sessions" role={role ?? undefined}>
      <SessionList restaurantId={restaurantId} tables={tables} />
    </AdminShell>
  );
}
