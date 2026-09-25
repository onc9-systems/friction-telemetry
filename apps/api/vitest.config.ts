import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { builtinModules } from "node:module";
import { defineConfig } from "vitest/config";

// Wrangler refuses a Hyperdrive binding without a local connection string. The shell's tests never
// connect to a database, so a placeholder that nothing dials is enough. A real value in the shell wins.
process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??= "postgres://test:test@127.0.0.1:5432/test";
process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE_NOCACHE ??=
  process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE;

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
            // The stub streams its script at once in tests. The live pipeline needs Postgres, Jev and AI Gateway,
            // so route tests run against the stub; the pipeline's decisions and parsing have their own tests.
            miniflare: { bindings: { STUB_PACE: "0", ENVIRONMENT: "development", ANSWER_PIPELINE: "stub" } },
          }),
        ],
        test: {
          name: "worker",
          include: ["test/**/*.test.ts"],
          exclude: ["test/**/*.node.test.ts"],
          // pg is CommonJS and requires pg-protocol, whose `import` build is plain .js in a non-module package,
          // which workerd cannot load. Pre-bundle pg (Workers Vitest known issues), leaving Node built-ins to nodejs_compat.
          deps: {
            optimizer: {
              ssr: {
                enabled: true,
                include: ["pg"],
                rolldownOptions: { external: [...builtinModules, /^node:/, "cloudflare:sockets"] },
              },
            },
          },
        },
      },
      {
        // @inngest/test pulls in @opentelemetry/api, which does not load inside workerd, so Inngest
        // function tests run in Node. The function code is the same module the Worker serves.
        test: { name: "node", include: ["test/**/*.node.test.ts"], environment: "node" },
      },
    ],
  },
});
