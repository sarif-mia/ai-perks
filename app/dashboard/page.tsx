import { requireSessionUser } from "@/lib/auth";
import WorkspaceApp from "@/components/workspace-app";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  await requireSessionUser();
  return <WorkspaceApp initialPage="overview" />;
}
