import { cookies } from "next/headers";
import { AdminShell } from "../../../../components/admin-shell";
import { ExceptionList } from "../../../../components/exception-list";
import { fetchRestaurantExceptions } from "../../../../lib/api-client";
import { getRoleFromCookie } from "../../../../lib/auth";

export default async function ExceptionsPage(props: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await props.params;
  const role = getRoleFromCookie(await cookies());
  const response = await fetchRestaurantExceptions(restaurantId);

  return (
    <AdminShell
      restaurantId={restaurantId}
      activeTab="exceptions"
      role={role ?? undefined}
    >
      <ExceptionList restaurantId={restaurantId} exceptions={response.exceptions} />
    </AdminShell>
  );
}
