import { adminContext } from "@/lib/admin";
import { json, route } from "@/lib/server";
export const GET = route(async () => {
  const { db, user } = await adminContext();
  const [{ results: companies }, { results: users }] = await Promise.all([
    db
      .prepare(
        "SELECT workspaces.id,workspaces.name,workspaces.owner_name AS ownerName,workspaces.suspended,workspaces.sample_imported AS sampleImported,workspaces.created_at AS createdAt,users.email,(SELECT COUNT(*) FROM records WHERE workspace_id=workspaces.id) AS records FROM workspaces LEFT JOIN users ON users.id=workspaces.owner_id ORDER BY workspaces.created_at DESC LIMIT 1000",
      )
      .all(),
    db
      .prepare(
        "SELECT id,email,name,role,created_at AS createdAt FROM users ORDER BY created_at DESC LIMIT 1000",
      )
      .all(),
  ]);
  return json({
    companies,
    users,
    user: { name: user.displayName, email: user.email },
  });
});
