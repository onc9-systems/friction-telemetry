import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Wrangler refuses a Hyperdrive binding without a local connection string. The shell's tests never
// connect to a database, so a placeholder that nothing dials is enough. A real value in the shell wins.
process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??= "postgres://test:test@127.0.0.1:5432/test";

export default defineConfig({
  test: {
    projects: [
      {
        // HTTP tests run inside workerd against the real Worker entry.
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./wrangler.jsonc" },
            // Workers AI has no local simulator and bills the real account. Tests never reach it.
            remoteBindings: false,
            // The stub streams its script at once in tests.
            miniflare: { bindings: { STUB_PACE: "0" } },
          }),
        ],
        test: { name: "worker", include: ["test/**/*.test.ts"], exclude: ["test/**/*.node.test.ts"] },
      },
      {
        // @inngest/test pulls in @opentelemetry/api, which does not load inside workerd, so Inngest
        // function tests run in Node. The function code is the same module the Worker serves.
        test: { name: "node", include: ["test/**/*.node.test.ts"], environment: "node" },
      },
    ],
  },
});
