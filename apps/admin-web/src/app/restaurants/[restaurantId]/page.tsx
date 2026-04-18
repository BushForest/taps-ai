import { cookies } from "next/headers";
import { AdminShell } from "../../../components/admin-shell";
import { TableGrid } from "../../../components/table-grid";
import { fetchRestaurantTables } from "../../../lib/api-client";
import { getRoleFromCookie } from "../../../lib/auth";

export default async function RestaurantPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  const role = getRoleFromCookie(await cookies());
  const { tables } = await fetchRestaurantTables(restaurantId);

  return (
    <AdminShell
      restaurantId={restaurantId}
      activeTab="floor"
      role={role ?? undefined}
    >
      <TableGrid
        initialTables={tables}
        restaurantId={restaurantId}
        restaurantName="Black+Blue Toronto — Floor View"
      />
    </AdminShell>
  );
}
