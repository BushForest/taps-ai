import { AdminShell } from "../../../../components/admin-shell";
import { ExceptionList } from "../../../../components/exception-list";
import { fetchRestaurantExceptions } from "../../../../lib/api-client";

export default async function ExceptionsPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  const response = await fetchRestaurantExceptions(restaurantId);

  return (
    <AdminShell
      restaurantId={restaurantId}
      activeTab="exceptions"
    >
      <ExceptionList restaurantId={restaurantId} exceptions={response.exceptions} />
    </AdminShell>
  );
}
