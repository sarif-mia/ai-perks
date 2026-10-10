import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const generated = resolve(root, "dist/server/wrangler.json");
if (!existsSync(generated))
  throw new Error("Run npm run build before deployment.");
function wrangler(args, capture = false) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      resolve(root, "scripts/sites-env.mjs"),
      resolve(root, "node_modules/wrangler/bin/wrangler.js"),
      ...args,
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      env: { ...process.env, CI: "true" },
    },
  );
  if (result.status !== 0) {
    if (capture) console.error(result.stderr || result.stdout);
    throw new Error(
      "Cloudflare command failed. Authenticate with npx wrangler login and retry. Existing resources were retained.",
    );
  }
  return result.stdout || "";
}
const directory = resolve(root, ".standalone");
mkdirSync(directory, { recursive: true });
const identityPath = resolve(directory, "hosting.json");
const identity = existsSync(identityPath)
  ? JSON.parse(readFileSync(identityPath, "utf8"))
  : {};
const name =
  process.env.AI_PERKS_WORKER_NAME ||
  identity.workerName ||
  "ai-perks-business-hub";
const databaseName = identity.databaseName || name + "-db";
let databaseId = process.env.CLOUDFLARE_D1_ID || identity.databaseId;
if (!databaseId && !dryRun) {
  let listed = JSON.parse(wrangler(["d1", "list", "--json"], true));
  let existing = listed.find((d) => d.name === databaseName);
  if (!existing) {
    wrangler(["d1", "create", databaseName, "--location", "apac"]);
    listed = JSON.parse(wrangler(["d1", "list", "--json"], true));
    existing = listed.find((d) => d.name === databaseName);
  }
  databaseId = existing?.uuid || existing?.id;
  if (!databaseId)
    throw new Error(
      "Database provisioning result could not be resolved. Inspect the Cloudflare D1 list; do not create another database.",
    );
}
if (databaseId) {
  writeFileSync(
    identityPath,
    JSON.stringify({ workerName: name, databaseName, databaseId }, null, 2) +
      "\n",
  );
}
const config = JSON.parse(readFileSync(generated, "utf8"));
config.name = name;
config.main = resolve(root, "dist/server/index.js");
config.assets = { ...config.assets, directory: resolve(root, "dist/client") };
config.d1_databases = [
  {
    binding: "DB",
    database_name: databaseName,
    database_id: databaseId || "00000000-0000-4000-8000-000000000000",
    migrations_dir: resolve(root, "drizzle"),
  },
];
delete config.topLevelName;
delete config.build;
config.observability = { enabled: true };
const configPath = resolve(directory, "wrangler.json");
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
if (dryRun) {
  wrangler(["deploy", "--config", configPath, "--dry-run"]);
  console.log(
    "Standalone deployment package verified. No remote resources were changed.",
  );
} else {
  wrangler([
    "d1",
    "migrations",
    "apply",
    "DB",
    "--remote",
    "--config",
    configPath,
  ]);
  wrangler(["deploy", "--config", configPath]);
  console.log(
    "Standalone deployment complete. Keep .standalone/hosting.json to reuse this database on future deployments.",
  );
}
