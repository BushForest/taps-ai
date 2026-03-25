import { AdminShell } from "../../../components/admin-shell";
import { TableGrid } from "../../../components/table-grid";
import { fetchRestaurantTables } from "../../../lib/api-client";

export default async function RestaurantPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  const { tables } = await fetchRestaurantTables(restaurantId);

  return (
    <AdminShell
      restaurantId={restaurantId}
      activeTab="floor"
    >
      <TableGrid
        initialTables={tables}
        restaurantId={restaurantId}
        restaurantName="Black+Blue Toronto — Floor View"
      />
    </AdminShell>
  );
}
