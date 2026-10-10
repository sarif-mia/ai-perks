import { requireSessionUser } from "@/lib/auth";
import WorkspaceApp from "@/components/workspace-app";
export const dynamic = "force-dynamic";
export default async function Section({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const { section } = await params;
  await requireSessionUser();
  return <WorkspaceApp initialPage={section[0]} />;
}
