import { env } from "cloudflare:workers";
import type { SqlDatabase } from "./sql";
export function runtime() {
  return { ...env, DB: env.DB as unknown as SqlDatabase | undefined } as {
    DB?: SqlDatabase;
    [key: string]: unknown;
  };
}
