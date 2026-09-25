declare module "cloudflare:workers" {
  interface ProvidedEnv extends Env {}
}

declare namespace Cloudflare {
  interface Env {
    /** Test-only binding: "1" when the tests have a real database (vitest.config.ts). */
    FT_DB_TESTS?: string;
  }
}
