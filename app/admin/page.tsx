import { requireSessionUser } from "@/lib/auth";
import AdminApp from "@/components/admin-app";
export const dynamic = "force-dynamic";
export default async function Admin() {
  const user = await requireSessionUser();
  if (user.role !== "superadmin")
    return (
      <main className="denied">
        <h1>Super-admin access required</h1>
        <p>This account has access to its own company workspace.</p>
        <a className="btn primary" href="/dashboard">
          Open your workspace
        </a>
      </main>
    );
  return <AdminApp />;
}
