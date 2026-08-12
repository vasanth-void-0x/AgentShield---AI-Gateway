import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type D1Binding = Parameters<typeof drizzle>[0];

export function getDb() {
  const runtimeEnv = (globalThis as typeof globalThis & {
    __AGENTSHIELD_ENV__?: { DB?: D1Binding };
  }).__AGENTSHIELD_ENV__;

  if (!runtimeEnv?.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Run `npm run cf:db:create` before deploying persistent storage."
    );
  }

  return drizzle(runtimeEnv.DB, { schema });
}
