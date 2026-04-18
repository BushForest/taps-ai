import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { getRoleFromCookie } from "../../lib/auth";
import { LeadsClient } from "./leads-client";

export default async function LeadsPage() {
  const role = getRoleFromCookie(await cookies());
  if (!role) redirect("/login" as Route);
  if (role !== "superadmin") redirect("/restaurants" as Route);

  return (
    <AdminShell role={role}>
      <LeadsClient />
    </AdminShell>
  );
}
