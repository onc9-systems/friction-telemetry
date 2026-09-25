# Shell: build reference

**Spec:** `01-shell.impl.md`
**Collected:** 24 September 2026, from Context7, the Cloudflare docs MCP, package sources on GitHub, the local Xcode 26.3 SDK, and `npm view` for versions.
**Purpose:** the verified library facts the shell build session needs, so it does not work from memory. Where the docs contradict the spec, the delta is listed first and the spec should follow the docs.

Items marked **[unverified]** could not be confirmed from docs or source; prove them with a test or a build before relying on them.

---

## Part 0: Deltas from the spec

These change what `01-shell.impl.md` says. Fix them in the build, and record each in the spec's Engineering Notes.

| # | Spec says | Docs say | Do this |
|---|---|---|---|
| 1 | `@cloudflare/vitest-pool-workers` | Renamed to `@cloudflare/vitest-plugin` (1.2.4). `defineWorkersConfig` removed; config is the `cloudflareTest()` Vite plugin. `SELF` and `env` from `cloudflare:test` deprecated. | Use `@cloudflare/vitest-plugin`, `import { env, exports } from "cloudflare:workers"`. |
| 2 | `vitest` (latest) | npm `latest` is 5.0.1, but the Cloudflare plugin peers on `vitest ^4.1.0`. | Pin `vitest@^4.1.0` in every workspace. |
| 3 | `compatibility_flags: ["nodejs_compat"]` | For `compatibility_date` 2026-08-04 or later, `nodejs_compat` is on by default and the flag is ignored. | Keep it (harmless, documents intent). |
| 4 | Streamed `error` event is ours | Hono `streamSSE`'s `onError` argument writes its own `event: error` frame with a plain-text message before closing. | Do not pass `onError` for contract errors. Catch inside the stream callback and `writeSSE({ event: "error", data: JSON })` yourself. |
| 5 | Inngest v4 client "with middleware" | v4 removed `EventSchemas`; typed events use `eventType(name, { schema })`. Middleware is a class extending `Middleware.BaseMiddleware`, passed as the class. **Default mode is cloud**: without `INNGEST_DEV=1` locally, the SDK rejects the dev server. | Code in Part 2. |
| 6 | Migration 0000 enables `vector` and creates every table | drizzle-kit never emits `CREATE EXTENSION`; the documented route is a custom migration generated before the schema. | `0000_enable_pgvector` (custom), then `0001` with all tables. |
| 7 | Timestamps are ISO 8601 strings | Drizzle `timestamp({ mode: "string" })` returns Postgres text (`2024-04-11 14:14:28.038697`, space, no `T`), which `z.iso.datetime()` rejects. | Use `mode: "date"` and serialize with `toISOString()` at the API boundary. |
| 8 | Neon default region `aws-us-east-1` | Neon has no Middle East or India region. By distance, Frankfurt is nearest the UAE (Singapore and London are further). | **Done 24 Sep 2026:** project `soft-lake-93513452` in `aws-eu-central-1`, branches `main` and `dev`; Hyperdrive `friction-telemetry-prod` (`8f08ea1a779445e486cece59c14a3178`); R2 `friction-telemetry-docs` (WEUR). |
| 9 | Pill style mask includes `.fullSizeContentView` | `NSWindow.h`: `.fullSizeContentView` is only respected for windows with a titlebar. It is a no-op on `.borderless`. | Drop it from the pill. |
| 10 | `CODE_SIGN_STYLE: Automatic` with `CODE_SIGN_IDENTITY: "Developer ID Application"` | Unproven combination in Xcode 26 **[unverified]**. Both working local Mac projects (octo, quail) use Automatic + `Apple Development` in Debug and Manual + `Developer ID Application` in Release. | Follow the proven split (Part 4). The keychain holds two identical Developer ID identities, so sign by the generic name, never the full string. |
| 11 | Pre-build script copies fixtures into the bundle | A folder reference in xcodegen (`type: folder`, `buildPhase: resources`) copies the directory with no script. | Use the folder reference. Fixtures land at `Contents/Resources/fixtures/`. |
| 12 | `MenuBarExtra`-style menu bar app with a SwiftUI main window | Apple: a `MenuBarExtra` "should not be used alongside other scene types"; removing the item terminates the app. | Status item is an AppKit `NSStatusItem`. Main window via `NSHostingSceneRepresentation` (Part 4). |
| 13 | EventSource "AsyncBytes events" | Correct, but the `EventSource` actor auto-reconnects and would re-send the POST. | Use only `URLSession.bytes(for:)` + `.events`. Never `EventSource(request:)` for `/v1/events`. |
| 14 | Capture key ⌃⌥Space | macOS symbolic hotkey 61, "Select next source in Input menu", is exactly ⌃⌥Space (enabled on some Macs), and ⌃⌥ is the VoiceOver modifier. | **Decided 24 Sep 2026** (brief, Shared Decisions): hold the bottom-left key (fn or left Control) through a listen-only `CGEventTap`, fallback ⌃⇧Space. The shell prints the sample "fn" from one `CaptureKeyDisplay` value; 03 binds, 04 consumes. |
| 15 | turbo `check-types` and `lint` depend on `^check-types` / `^lint` | Turbo's own docs call this wrong (forces sequential runs); JIT internal packages use a `transit` node. | turbo.json in Part 3. |

---

## Part 1: Versions (npm registry and GitHub, 24 September 2026)

| Package | Version | Note |
|---|---|---|
| `hono` | 4.13.9 | |
| `@hono/zod-validator` | 0.9.1 | peers `zod ^3.25 \|\| ^4`, `hono >=4.11.2` |
| `zod` | 4.6.5 | import from `"zod"` |
| `inngest` | 4.21.0 | `latest` tag confirmed; v3 lives on `v3-lts` |
| `@inngest/test` | 1.0.0 | peers `inngest ^4.0.0` |
| `drizzle-orm` | 0.45.3 | `rc` tag is 1.0.0-rc.4; do not use |
| `drizzle-kit` | 0.31.11 | |
| `pg` | 8.23.0 | Hyperdrive needs `>=8.16.3`; add `@types/pg` |
| `wrangler` | 4.137.0 | |
| `vitest` | pin `^4.1.0` | 5.0.1 is latest but unsupported by the plugin |
| `@cloudflare/vitest-plugin` | 1.2.4 | |
| `turbo` | 2.11.3 | |
| `neon` (Neon CLI) | 6.0.0 | package is `neon`, not `neonctl`; not installed here |
| xcodegen | 2.45.4 installed (2.46.0 latest) | nothing needs 2.46 |
| Xcode | 26.3 (17C529), SDK MacOSX26.2 | `xcode-select` points at CLT; always set `DEVELOPER_DIR` |
| KeyboardShortcuts | 3.1.0 (11 Sep 2026) | swift-tools 6.2 |
| mattt/EventSource | 1.5.1 (17 Aug 2026) | |
| Sparkle | 2.10.0 (13 Sep 2026) | binary XCFramework |

`npm view` fails inside the repo because `devEngines` pins bun. Run it from `/tmp`.

---

## Part 2: Service (`apps/api`)

Sources: `/websites/hono_dev`, `/honojs/hono`, `/honojs/middleware`, `/cloudflare/workers-sdk`, Cloudflare docs MCP (Vitest integration, Hyperdrive, Wrangler config pages dated August 2026), `/websites/inngest` (v4 reference pages), `/inngest/inngest-js`.

### 2.1 wrangler.jsonc

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "friction-telemetry-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true, "logs": { "head_sampling_rate": 1 } },
  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<hyperdrive-config-id>" }],
  "r2_buckets": [{ "binding": "FILES", "bucket_name": "friction-telemetry-docs" }],
  "ai": { "binding": "AI" },
  "dev": { "port": 8787 }
}
```

- **Port.** With `dev.port` or `--port` set, a busy port throws `ERR_ADDRESS_IN_USE` and does not drift. Only an unconfigured port probes upward from 8787 (workers-sdk source).
- **Hyperdrive locally.** Do not commit `localConnectionString`. Set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` (suffix is the binding name) from `~/.secrets/projects.env`. Include `sslmode=require` for Neon. No query caching locally.
- **Hyperdrive must use Neon's direct URL**, not the `-pooler` host. Hyperdrive does the pooling (transaction mode: `SET` lasts one transaction).
- **Hyperdrive caches reads and does not invalidate on write.** For read-after-write (upsert a flag, then read it back), either read inside the same transaction or add a second Hyperdrive config with caching disabled.
- **Workers AI** always runs against the real account and bills, even in `wrangler dev`. Stub `env.AI` in tests.
- **Types.** `wrangler types` writes `worker-configuration.d.ts` with `interface Env`. `wrangler types --check` exits 1 when stale (useful in `check-types`). Use `new Hono<{ Bindings: Env }>()`.
- `.dev.vars` holds `INNGEST_DEV=1` and is git-ignored.

### 2.2 Hono routing and 501 stubs

One `new Hono<{ Bindings: Env }>()` per route file, mounted with `app.route()`. Every sub-app needs the same `Bindings` generic, or `c.env` is untyped inside it.

```ts
// src/routes/initiatives.ts  (flows 3, 3a, 4, 5)
import { Hono } from "hono";
const notImplemented = (flow: number) => (c: Context) =>
  c.json({ flow, status: "not_implemented" }, 501);

const initiatives = new Hono<{ Bindings: Env }>()
  .post("/", notImplemented(3))
  .get("/", notImplemented(4))
  .get("/:id", notImplemented(4))
  .patch("/:id", notImplemented(4))
  .post("/:id/close", notImplemented(5))
  .post("/:id/publish", notImplemented(3));
export default initiatives;

// src/index.ts
const app = new Hono<{ Bindings: Env }>();
app.route("/v1/initiatives", initiatives);
app.on(["GET", "PUT", "POST"], "/api/inngest", serve({ client: inngest, functions }));
app.all("/api/auth/*", (c) => c.json({ flow: 1, status: "not_implemented" }, 501));
export default app;
```

`app.on` takes a method array and also a path array. `c.req.header("x-ft-stub-script")` reads the script header.

### 2.3 `POST /v1/events`: validate, then stream

**Validator.** `@hono/zod-validator` supports Zod 4 (peers `^3.25 || ^4`, types branch on `v4.$ZodType`). With no hook it returns `c.json(safeParseResult, 400)`.

```ts
import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import { streamSSE } from "hono/streaming";
import { EventBody } from "@friction-telemetry/contracts";

events.post(
  "/",
  zValidator("json", EventBody, (result, c) => {
    if (!result.success) return c.json({ error: "invalid_body", message: z.prettifyError(result.error) }, 400);
  }),
  (c) => {
    const body = c.req.valid("json");
    const script = c.req.header("x-ft-stub-script") === "provisional_routed" ? "provisional_routed" : "answered";
    return streamSSE(c, async (stream) => {
      try {
        for (const step of SCRIPTS[script](body)) {
          if (stream.aborted) return;
          await stream.sleep(step.delayMs);
          await stream.writeSSE({ event: step.event, data: JSON.stringify(step.data) });
        }
      } catch (err) {
        await stream.writeSSE({ event: "error", data: JSON.stringify({ code: "stub_failed", message: String(err) }) });
      }
    });
  },
);
```

`streamSSE` facts from source (`src/helper/streaming/sse.ts`):
- `writeSSE({ data, event?, id?, retry? })` writes one `data:` line per line of `data`, then a blank line. It throws if `event` or `id` contain CR or LF.
- `stream.sleep(ms)`, `stream.onAbort(fn)`, `stream.aborted`, `stream.closed`, `stream.close()`.
- It sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- Errors inside the callback bypass `app.onError`; the response has already started.
- Writes after a client disconnect fail silently (`catch {}` in `StreamingApi.write`). Check `stream.aborted` in the loop.

Validation gotchas:
- The `json` target only parses when the request has `Content-Type: application/json`. Without it the schema sees `{}` and returns 400. Tests and the Swift client must set it.
- Malformed JSON throws `HTTPException(400)` before your hook runs. To return the same body shape, map it in `app.onError` (`err instanceof HTTPException`).

### 2.4 Tests

```ts
// apps/api/vitest.config.ts
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
});
```
```jsonc
// apps/api/test/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": { "moduleResolution": "bundler", "types": ["@cloudflare/vitest-plugin/types"] },
  "include": ["./**/*.ts", "../worker-configuration.d.ts"]
}
```
```ts
// apps/api/test/env.d.ts
declare module "cloudflare:workers" { interface ProvidedEnv extends Env {} }
```
```ts
import { exports } from "cloudflare:workers";

it("given a valid flag, when posted, then events arrive in contract order", async () => {
  const res = await exports.default.fetch("http://x/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ft-stub-script": "provisional_routed" },
    body: JSON.stringify(flagFixture),
  });
  expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);
  const frames = (await res.text()).trim().split("\n\n").map((f) =>
    Object.fromEntries(f.split("\n").map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 2)])));
  const order = frames.map((f) => f.event).filter((e, i, a) => e !== "delta" || a[i - 1] !== "delta");
  expect(order).toStrictEqual(["meta", "provisional", "delta", "class", "count", "done"]);
});
```

- `app.request(path, init, env)` also works; the third argument becomes `c.env`.
- Pacing runs in real time. Make the delay scale injectable (a var such as `STUB_PACE=0` in the test miniflare config) so the ordering test is fast. Whether fake timers affect `stream.sleep` in workerd is **[unverified]**.
- Storage is isolated per test file. Coverage must use Istanbul. `fetchMock` from `cloudflare:test` is removed.
- Hyperdrive in tests: `cloudflareTest({ miniflare: { hyperdrives: { HYPERDRIVE: "postgres://..." } } })`. Whether the plugin reads the local connection string env var on its own is **[unverified]**. The shell's tests do not need a database.

### 2.5 Database client over Hyperdrive

```ts
// src/db/client.ts
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export async function openDb(env: Env) {
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  return drizzle({ client, schema });
}
```

- One client per request; never at module scope ("Cannot perform I/O on behalf of a different request").
- Current Cloudflare examples never call `client.end()`; the runtime cleans up at the end of the request. `c.executionCtx.waitUntil(client.end())` is harmless but undocumented.

### 2.6 Inngest v4

**Client and typed events.**

```ts
// packages/contracts/src/events.ts
import { eventType } from "inngest";
import * as z from "zod";
export const systemPing = eventType("ft/system.ping", { schema: z.object({ sentAt: z.iso.datetime() }) });
```
- `eventType(name, { schema })` accepts any Standard Schema. Zod 4 implements Standard Schema; an explicit Zod 4 statement was not found **[unverified]**, so typecheck one `eventType` early.
- **Event schemas cannot contain transforms** (compile error "Transforms not supported"). No `.transform()`, coercion, or input-changing `.default()`.
- `new EventSchemas().fromZod()` is v3 and is gone. The `@inngest/middleware-validation` README still shows it; ignore it.
- This makes `packages/contracts` depend on `inngest` for `eventType`. If that is unwanted, export plain Zod schemas from contracts and call `eventType` in `apps/api/src/inngest/events.ts`.

```ts
// apps/api/src/inngest/bindings.ts
import { Middleware } from "inngest";
import type { Context } from "hono";

export class HonoBindingsMiddleware extends Middleware.BaseMiddleware {
  id = "hono-bindings";
  private env!: Env;
  async wrapRequest({ next, requestArgs }: Middleware.WrapRequestArgs) {
    this.env = (requestArgs[0] as Context<{ Bindings: Env }>).env; // inngest/hono passes [honoContext]
    return await next();
  }
  transformFunctionInput(args: Middleware.TransformFunctionInputArgs) {
    return { ...args, ctx: { ...args.ctx, env: this.env } };
  }
}

// apps/api/src/inngest/client.ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "friction-telemetry", middleware: [HonoBindingsMiddleware] });
```
- A new middleware instance is created per request (documented), so instance state is safe.
- Wrapping hooks must call `next()` or the request hangs.
- Never change the app `id`; a new id is a new app in Cloud.

**Function (v4 shape: two arguments, triggers in config).**

```ts
export const systemPingFn = inngest.createFunction(
  { id: "system-ping", triggers: [systemPing] },
  async ({ step }) => step.run("echo", () => ({ receivedAt: new Date().toISOString() })),
);
export const functions = [systemPingFn];
```
- v3's three-argument form `createFunction({ id }, { event }, handler)` is gone.
- `step.run` output is JSON-serialized. Checkpointing is on by default in v4; if runs approach Worker limits, set `checkpointing: { maxRuntime }` on the client.

**Serve.** `app.on(["GET","PUT","POST"], "/api/inngest", serve({ client: inngest, functions }))` from `inngest/hono`. v4 serve options: `client`, `functions`, `serveOrigin`, `servePath`, `streaming` (boolean). `signingKey` and `baseUrl` moved to the client constructor. `serveHost` is deprecated in favor of `serveOrigin`.

**Env on Workers.** The SDK resolves settings lazily per request: option, then env var, then default. Keys: `INNGEST_SIGNING_KEY`, `INNGEST_SIGNING_KEY_FALLBACK`, `INNGEST_EVENT_KEY`, `INNGEST_DEV`, `INNGEST_SERVE_ORIGIN`, `INNGEST_ENV`. Mode: `isDev` option, else `INNGEST_DEV` as boolean or URL, else **cloud**. A signing key does not select cloud mode; the absence of `INNGEST_DEV` does.
- Check `GET /api/inngest`: it reports `mode`, `has_signing_key`, `has_event_key`, `function_count`. If prod shows `has_signing_key: false`, add `app.use("/api/inngest", async (c, next) => { inngest.setEnvVars(c.env); await next(); })`. That `serve` reads `c.env` itself is strongly implied but **[unverified]**.
- **Sending outside `serve()` needs `setEnvVars`**: `await inngest.setEnvVars(c.env).send(systemPing.create({ sentAt }))`. Await it; the docs do not cover `waitUntil`.

**Local dev.** `bunx inngest-cli@latest dev -u http://localhost:8787/api/inngest --no-discovery`, UI on 8288. The default SDK URL is port 3000, so `-u` is required.

**Cloud sync.** No Workers auto-sync integration was found (Pages only). After each push that changes functions, sync by `curl -X PUT https://<worker-host>/api/inngest`, the dashboard, or `POST https://api.inngest.com/v2/apps/$APP_ID/syncs`. Signature failures read `Invalid signature` (wrong key or wrong environment), `Signature has expired` (clock skew over 5 minutes), or `No signing key found...`.

**Test.**
```ts
import { InngestTestEngine } from "@inngest/test";
const t = new InngestTestEngine({
  function: systemPingFn,
  events: [{ name: "ft/system.ping", data: { sentAt: "2026-09-24T00:00:00.000Z" } }],
  reqArgs: [{ env: {} }], // stands in for the Hono context the middleware reads
});
const { result, error } = await t.execute();
```
Do not mock the `echo` step and then assert the mock's value. Whether `wrapRequest` runs in the test engine with `reqArgs` is **[unverified]**; prove it with one test that reads `env`.

---

## Part 3: Contracts, schema, Neon, workspace

Sources: `/colinhacks/zod`, `/websites/zod_dev`, `/drizzle-team/drizzle-orm-docs`, `/drizzle-team/drizzle-orm/drizzle-kit_0.31.5`, `/websites/developers_cloudflare_hyperdrive`, `/websites/neon`, the `neon` and `neon-postgres` skills, `/vercel/turborepo`, `/websites/bun`.

### 3.1 Zod 4 contracts

```ts
// packages/contracts/src/enums.ts  (one tuple per enum, shared by Zod and pgEnum)
export const INITIATIVE_STATUS = ["draft", "live", "closed"] as const;
export const THESIS_VERDICT = ["holding", "breaking", "no_evidence"] as const;
export const MEMBER_ROLE = ["affected", "owner", "leader"] as const;
export const DOCUMENT_VERSION_STATUS = ["uploading", "extracting", "indexing", "ready", "failed"] as const;
export const RESOLUTION_CLASS = ["answered", "unanswerable", "still_stuck"] as const;
export const QA_ENTRY_STATUS = ["draft", "published", "needs_reapproval"] as const;
export const NOTICE_KIND = ["fix_recorded", "qa_published"] as const;
export const HEALTH_LABEL = ["healthy", "at_risk", "breaking"] as const;
```
```ts
import * as z from "zod";
export const Id = z.uuid();
export const Instant = z.iso.datetime({ offset: true });
export const ResolutionClass = z.enum(RESOLUTION_CLASS);

export const Flag = z.object({
  id: Id,
  initiativeId: Id.nullable(),
  transcript: z.string(),
  screenshotKey: z.string().nullable(),
  clipKey: z.string().nullable(),
  appNames: z.array(z.string()),
  resolutionClass: ResolutionClass.nullable(),
  createdAt: Instant,
});
export type Flag = z.infer<typeof Flag>;

// SSE union, discriminated on `event`
export const SSEEvent = z.discriminatedUnion("event", [
  z.object({ event: z.literal("meta"), eventId: Id, initiativeId: Id, initiativeName: z.string(), initiativeConfidence: z.number() }),
  z.object({ event: z.literal("provisional"), message: z.string() }),
  z.object({ event: z.literal("delta"), text: z.string() }),
  // citation, class, count, done, error
]);

// Answer: exactly one of flagId / questionId, structurally (also visible in JSON Schema)
export const AnswerTarget = z.xor([
  z.object({ flagId: Id, questionId: z.null() }),
  z.object({ flagId: z.null(), questionId: Id }),
]);
```

- Import from `"zod"`. The `zod/v4` subpath is for library authors.
- **`z.uuid()` enforces RFC version and variant bits.** Hand-written fixture ids like `00000000-0000-0000-0000-000000000001` fail. Generate real v4 ids for fixtures (Swift `UUID()` produces v4).
- `z.iso.datetime()` rejects offsets such as `+02:00` unless `{ offset: true }`; it accepts any sub-second precision by default.
- Refinements (`.refine`) do not appear in `z.toJSONSchema`; `z.xor` does. In refine options use `error`, not the deprecated `message`. Use `z.prettifyError` / `z.treeifyError`, not `.format()` or `.flatten()`.
- `z.toJSONSchema(schema)` defaults to draft 2020-12; `z.uuid()` becomes `format: "uuid"`, `z.iso.datetime()` becomes `format: "date-time"`. Keep contracts free of `transform`, `date`, and `bigint` so export never throws.
- `ZodEnum.options` is a plain array, not a non-empty tuple, so it does not type-check as a `pgEnum` argument. That is why the tuples above are the source.

### 3.2 Drizzle schema (stay on 0.45.3 + kit 0.31.11)

The main Drizzle docs now describe v1 RC. Ignore pages that show migration folders (`<timestamp>_<name>/migration.sql`), `drizzle-kit up`, `defineRelations`, `drizzle-orm/zod`, or `pgTable.withRLS`. The schema APIs below are identical in both.

```ts
import { sql, type SQL } from "drizzle-orm";
import { pgTable, pgEnum, uuid, text, integer, jsonb, timestamp, index, check, customType, vector } from "drizzle-orm/pg-core";
import { RESOLUTION_CLASS, type HealthComponent } from "@friction-telemetry/contracts";

export const resolutionClass = pgEnum("resolution_class", RESOLUTION_CLASS);
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const passage = pgTable(
  "passage",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    initiativeId: uuid("initiative_id").notNull(),
    documentVersionId: uuid("document_version_id").notNull(),
    headingPath: text("heading_path").notNull(),
    locator: integer(),
    text: text().notNull(),
    position: integer().notNull(),
    embedding: vector("embedding", { dimensions: 1024 }),
    tsv: tsvector("tsv").notNull().generatedAlwaysAs((): SQL => sql`to_tsvector('english', ${passage.text})`),
  },
  (t) => [
    index("passage_org_initiative_idx").on(t.organizationId, t.initiativeId),
    index("passage_embedding_hnsw").using("hnsw", t.embedding.op("vector_cosine_ops")),
    index("passage_tsv_gin").using("gin", t.tsv),
  ],
);

export const flag = pgTable("flag", {
  id: uuid().primaryKey(),                       // client-generated, no default: retries upsert
  organizationId: text("organization_id").notNull(),
  userId: text("user_id").notNull(),             // no FK until phase 02
  appNames: text("app_names").array().notNull().default(sql`'{}'::text[]`),
  resolutionClass: resolutionClass("resolution_class"),
  createdAt: ts("created_at").notNull().defaultNow(),
  // ...
});

export const answer = pgTable("answer", {
  id: uuid().primaryKey(),
  flagId: uuid("flag_id"),
  questionId: uuid("question_id"),
  // ...
}, (t) => [check("answer_exactly_one_target", sql`num_nonnulls(${t.flagId}, ${t.questionId}) = 1`)]);

export const healthSnapshot = pgTable("health_snapshot", {
  // ...
  components: jsonb().$type<HealthComponent[]>().notNull(), // compile-time only; parse with Zod on read
});
```

- Third argument to `pgTable` returns an **array**.
- `timestamp` with `mode: "date"`: see delta 7.
- Upsert on client ids: `db.insert(flag).values(v).onConflictDoNothing({ target: flag.id })`.
- Vector search: `sql<number>\`1 - (${cosineDistance(passage.embedding, q)})\``. Full-text: `sql\`${passage.tsv} @@ websearch_to_tsquery('english', ${q})\``.

### 3.3 Migrations

```ts
// apps/api/drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
  strict: true,
});
```
```bash
bunx drizzle-kit generate --custom --name=enable-pgvector   # write: CREATE EXTENSION IF NOT EXISTS vector;
bunx drizzle-kit generate --name=domain-tables
bunx drizzle-kit migrate
```
- Generate the extension migration **before** any schema exists so it is 0000.
- Migrate against the direct URL only. The `neon-postgres` skill: through the pooler it "can fail, and never in a way that names pooling".
- `push` is for throwaway schema experiments, not the shell.

### 3.4 Neon

```bash
bun i -g neon
neon projects create --name friction-telemetry --org-id org-sparkling-dawn-02665417 \
  --region-id aws-us-east-1 --pg-version 17 --set-context
neon branches create --name dev
neon connection-string dev            # direct by default (per skill)
```
- Or use the skill's branch-first flow: `neon link`, then `neon checkout dev` (writes `DATABASE_URL` and `DATABASE_URL_UNPOOLED`). Fold the long-lived URL into `~/.secrets/projects.env` as `FRICTION_TELEMETRY__DATABASE_URL`, per global CLAUDE.md.
- The console and TS SDK default to **pooled**; the CLI defaults to direct. Hyperdrive and migrations both need direct.
- Cloudflare recommends a dedicated Postgres role for Hyperdrive.

### 3.5 Workspace

```jsonc
// packages/contracts/package.json  (JIT internal package, no build step)
{
  "name": "@friction-telemetry/contracts",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts", "./fixtures/*": "./fixtures/*" },
  "scripts": { "test": "vitest run", "check-types": "tsc --noEmit" },
  "dependencies": { "zod": "^4.6.5" },
  "devDependencies": { "vitest": "^4.1.0" }
}
// apps/api/package.json: "@friction-telemetry/contracts": "workspace:*"
```
```jsonc
// turbo.json
{
  "tasks": {
    "transit": { "dependsOn": ["^transit"] },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".output/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["transit"], "outputs": ["coverage/**"] },
    "lint": { "dependsOn": ["transit"] },
    "check-types": { "dependsOn": ["transit"] }
  }
}
```
JIT package limits: consumers must transpile TS (wrangler and vitest do); no TS `paths` inside the package; turbo cannot cache its build; its type errors surface in the consumer's `check-types`. The contracts package's own tests need no Workers plugin.

---

## Part 4: Mac app (`apps/mac`)

Sources: `/yonaskolb/xcodegen` plus `Docs/ProjectSpec.md` and `PBXProjGenerator.swift` via `gh api`; `/sindresorhus/keyboardshortcuts`; `/mattt/eventsource` plus source; `/websites/sparkle-project` plus `SPUUpdater.m`; `/websites/developer_apple_appkit`, `/websites/developer_apple_swiftui`, SDK headers in MacOSX26.2.sdk; `/swiftlang/swift-testing`; local precedent in `~/Projects/octo/apps/mac` and `~/Projects/quail/apps/mac`.

### 4.1 project.yml

```yaml
name: Friction
options:
  bundleIdPrefix: systems.onc9
  createIntermediateGroups: true
  deploymentTarget: { macOS: "26.0" }

settings:
  base:
    DEVELOPMENT_TEAM: P62A3QS593
    CODE_SIGN_STYLE: Automatic
    CODE_SIGN_IDENTITY: "Apple Development"
    ENABLE_HARDENED_RUNTIME: YES
    SWIFT_VERSION: "6.0"            # xcodegen's base preset forces 5.0 otherwise
    MARKETING_VERSION: "0.1.0"
    CURRENT_PROJECT_VERSION: "1"
  configs:
    Debug: { API_BASE_URL: "http://localhost:8787" }
    Release: { API_BASE_URL: "https://<worker-host>" }

packages:
  KeyboardShortcuts: { url: https://github.com/sindresorhus/KeyboardShortcuts, from: 3.1.0 }
  EventSource: { url: https://github.com/mattt/EventSource, from: 1.5.1 }
  Sparkle: { url: https://github.com/sparkle-project/Sparkle, from: 2.10.0 }

targets:
  Friction:
    type: application
    platform: macOS
    sources:
      - path: Friction
      - path: ../../packages/contracts/fixtures
        type: folder
        buildPhase: resources
    info:
      path: Friction/Generated/Info.plist
      properties:
        LSUIElement: true
        NSMicrophoneUsageDescription: "Friction listens only while you hold the capture key."
        NSSpeechRecognitionUsageDescription: "Friction turns what you say into text on this Mac so you can review it before anything is sent."
        NSScreenCaptureUsageDescription: "Friction keeps the last few seconds of your screen on this Mac so a flag can include what you were looking at. Nothing leaves without your review."
        APIBaseURL: $(API_BASE_URL)
    entitlements:
      path: Friction/Generated/Friction.entitlements
      properties:
        com.apple.security.device.audio-input: true
    dependencies:
      - package: KeyboardShortcuts
      - package: EventSource
      - package: Sparkle
    settings:
      base: { PRODUCT_BUNDLE_IDENTIFIER: systems.onc9.friction }
      configs:
        Debug: { SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG" }
        Release:
          CODE_SIGN_STYLE: Manual
          CODE_SIGN_IDENTITY: "Developer ID Application"
          PROVISIONING_PROFILE_SPECIFIER: ""
          CODE_SIGN_INJECT_BASE_ENTITLEMENTS: NO   # strips get-task-allow; notarization rejects it
          OTHER_CODE_SIGN_FLAGS: "--timestamp"
    scheme:
      testTargets: [FrictionTests]

  FrictionTests:
    type: bundle.unit-test
    platform: macOS
    sources: [FrictionTests]
    dependencies: [{ target: Friction }]   # xcodegen sets TEST_HOST and BUNDLE_LOADER from this
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: systems.onc9.friction.tests
        GENERATE_INFOPLIST_FILE: YES
```

- Read the base URL with `Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String`.
- `info:` and `entitlements:` generate the files on every `xcodegen generate`; every key beyond the basic CFBundle ones must be listed in `properties`.
- `configs` keys match any config name containing the key. Setting `SWIFT_ACTIVE_COMPILATION_CONDITIONS` replaces the preset, so repeat `DEBUG`.
- Top-level `settings` is either a flat map or `base`/`configs`; mixing silently drops the flat map.
- Keep target name equal to product name; `TEST_HOST` is derived from it.
- `ENABLE_USER_SCRIPT_SANDBOXING` is NO in xcodegen projects (build-system default), so a script reading `../../packages` would work, but the folder reference needs no script.
- Commit `Package.resolved` (under the generated project's `xcshareddata/swiftpm/`) or pin with `exactVersion:` for reproducible builds. Since the `.xcodeproj` is ignored, copy `Package.resolved` out or pin exact versions.
- Whether macOS shows the `NSScreenCaptureUsageDescription` string in its prompt is **[unverified]**; including it is harmless.

### 4.2 Panels

```swift
final class FirstMouseHostingView<V: View>: NSHostingView<V> {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

final class FloatingPanel: NSPanel {
    private let keyable: Bool
    init(content: some View, size: NSSize, keyable: Bool) {
        self.keyable = keyable
        super.init(contentRect: NSRect(origin: .zero, size: size),
                   styleMask: [.nonactivatingPanel, .borderless],   // at init; never mutate later
                   backing: .buffered, defer: false)
        isFloatingPanel = true
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
        hidesOnDeactivate = false
        becomesKeyOnlyIfNeeded = keyable
        isReleasedWhenClosed = false
        isOpaque = false
        backgroundColor = .clear
        hasShadow = true
        isMovableByWindowBackground = !keyable
        contentView = FirstMouseHostingView(rootView: AnyView(content))
    }
    override var canBecomeKey: Bool { keyable }   // pill false, capture review true
    override var canBecomeMain: Bool { false }
}
// show: panel.orderFrontRegardless()
```

- `.nonactivatingPanel` applies only to `NSPanel`: "does not activate the owning app".
- A borderless window cannot become key unless `canBecomeKey` is overridden, so the capture review panel must return `true`.
- `becomesKeyOnlyIfNeeded` works with the hit view's `needsPanelToBecomeKey` (text fields return true).
- **Hover in a non-key panel of an inactive app.** Whether SwiftUI `onHover` fires there is **[unverified]**. The documented route is an `NSTrackingArea` with `[.mouseEnteredAndExited, .activeAlways, .inVisibleRect]` in an `NSViewRepresentable` whose `hitTest` returns nil (octo and quail `HoverZone.swift`). Gotcha from that code: a tracking area installed under a pointer already inside it never fires `mouseEntered`; re-sync from `window.mouseLocationOutsideOfEventStream` in `updateTrackingAreas`, deferred one turn.

### 4.3 App structure and activation policy

Recommended (documented on macOS 26): AppKit lifecycle, `NSStatusItem` for the menu, SwiftUI `Window` hosted through `NSHostingSceneRepresentation`.

```swift
@main
final class AppDelegate: NSObject, NSApplicationDelegate {
    let scenes = NSHostingSceneRepresentation {
        Window("Friction", id: "main") { MainView() }
    }
    func applicationWillFinishLaunching(_ n: Notification) {
        NSApp.addSceneRepresentation(scenes)
        NSApp.setActivationPolicy(.accessory)
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { false }
    func openMain() {
        NSApp.setActivationPolicy(.regular)
        scenes.environment.openWindow(id: "main")
        NSApp.activate()
    }
}
```
- SDK-verified: `NSApplication.addSceneRepresentation(_:)` and `NSHostingSceneRepresentation.environment` are macOS 26.0 API.
- **[unverified]**: Apple's sample opens only a `Settings` scene this way; that `Window` works is not shown. Also unverified: whether `@main` on the delegate needs an explicit `static func main()`. Prove both on the first build.
- Fallback if the above fails: SwiftUI `App` with `@NSApplicationDelegateAdaptor`, a `Window` scene with `.defaultLaunchBehavior(.suppressed)` and `.restorationBehavior(.disabled)`, and an `openWindow` action captured from a view and handed to the AppKit side (a common, undocumented workaround).
- Leaving the Dock: observe `NSWindow.willCloseNotification` for the main window, then `setActivationPolicy(.accessory)`.
- `.accessory` is the runtime equivalent of `LSUIElement`. `NSApp.activate()` is the macOS 14+ cooperative call.
- Sparkle's gentle-reminder recipe also flips the activation policy; later phases must route that through the same owner.

### 4.4 Per-display pill position

- macOS 26: `NSScreen.cgDirectDisplayID` (SDK-verified).
- `CGDirectDisplayID` can change across reconnects. Persist a stable key: `CFUUIDCreateString(nil, CGDisplayCreateUUIDFromDisplayID(id).takeRetainedValue())`.
- Store `[displayUUID: NSPoint]` in UserDefaults and clamp to `screen.visibleFrame` on restore.

### 4.5 Packages

**KeyboardShortcuts 3.1.0** (product `KeyboardShortcuts`)
```swift
extension KeyboardShortcuts.Name {
    static let capture = Self("capture", initial: .init(.space, modifiers: [.control, .shift]))  // fallback key
}
// phase 04:
for await e in KeyboardShortcuts.events(for: .capture) { e == .keyDown ? begin() : end() }
// Settings:
KeyboardShortcuts.Recorder("Capture key", name: .capture)
```
- 3.0 renamed `default:` to `initial:`.
- Built with swift-tools 6.2 and default MainActor isolation; `EventType` is `Sendable`.
- While an `NSMenu` is open, key events buffer and fire on close: `KeyboardShortcuts.disable(.capture)` in `menuWillOpen`, `enable` in `menuDidClose`.
- This is the no-permission fallback. The default capture key is a lone fn or left Control heard through a listen-only `CGEventTap` (delta 14; recipe in `03-permissions-onboarding.impl.md`).

**mattt/EventSource 1.5.1** (product `EventSource`)
```swift
var req = URLRequest(url: base.appending(path: "v1/events"))
req.httpMethod = "POST"
req.setValue("application/json", forHTTPHeaderField: "Content-Type")
req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
req.setValue(script.rawValue, forHTTPHeaderField: "x-ft-stub-script")
req.httpBody = try JSONEncoder.contract.encode(flag)
let (bytes, response) = try await URLSession.shared.bytes(for: req)
guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
for try await sse in bytes.events {
    state = reduce(state, try SSEEvent(name: sse.event ?? "message", data: sse.data))
}
```
- `EventSource.Event` (alias `SSE`): `id: String?`, `event: String?`, `data: String`, `retry: Int?`. `event == nil` means `"message"`.
- The sequence type is `AsyncServerSentEventsSequence` (file `AsyncEventsSequence.swift`).
- For reducer tests, feed events directly; the low-level `EventSource.Parser` actor exists if raw bytes are needed.
- SPM may fetch `async-http-client` and `swift-nio` even though they are trait-gated **[unverified]**.

**Sparkle 2.10.0** (product `Sparkle`)
```swift
let updater = SPUStandardUpdaterController(startingUpdater: false, updaterDelegate: nil, userDriverDelegate: nil)
```
- Not starting it is safe without `SUFeedURL` / `SUPublicEDKey`: the keys are checked only in `startUpdater`. A failed start shows a developer-facing alert, so never call it until both keys exist. An invalid `SUPublicEDKey` is fatal.
- `SPUStandardUserDriverDelegate` is not MainActor-annotated; under Swift 6 conform with `nonisolated` members **[unverified by compile]**.
- XPC services are only for sandboxed apps; not needed.

### 4.6 Tests (Swift Testing)

```swift
import Testing
import AppKit
@testable import Friction

@MainActor @Suite(.serialized) struct PillPanelTests {
    @Test func pillNeverTakesFocus() {
        let p = FloatingPanel(content: EmptyView(), size: .init(width: 44, height: 44), keyable: false)
        #expect(p.canBecomeKey == false)
        #expect(p.styleMask.contains(.nonactivatingPanel))
        #expect(p.collectionBehavior.contains([.canJoinAllSpaces, .fullScreenAuxiliary]))
    }
}

@Test func everyFixtureDecodes() throws {
    let dir = try #require(Bundle(for: AppDelegate.self).url(forResource: "fixtures", withExtension: nil))
    let data = try Data(contentsOf: dir.appending(path: "initiatives.json"))
    _ = try JSONDecoder.contract.decode([Initiative].self, from: data)
}

extension JSONDecoder {
    static let contract: JSONDecoder = {
        let d = JSONDecoder()
        let frac = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
        let plain = Date.ISO8601FormatStyle()
        d.dateDecodingStrategy = .custom { dec in
            let s = try dec.singleValueContainer().decode(String.self)
            return (try? frac.parse(s)) ?? (try plain.parse(s))
        }
        return d
    }()
}
```
- `Bundle.module` does not exist in an Xcode test target (SPM only). Use `Bundle(for:)` with a class from the app; in a hosted test it resolves to `Friction.app`.
- Tests run in parallel by default; `.serialized` on AppKit suites.
- JS `toISOString()` emits milliseconds. `.iso8601` decoding tolerates fractions only from Swift 6.2 Foundation, and the default encoder writes none, so use the explicit strategy above in both directions.
- The test bundle loads into a hardened-runtime host; keep `DEVELOPMENT_TEAM` project-wide so both are signed by the same team.

### 4.7 Build headless

```bash
cd apps/mac && xcodegen generate --quiet
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project Friction.xcodeproj -scheme Friction -configuration Debug \
  -destination 'platform=macOS' -derivedDataPath build build test
```
- No `-skipMacroValidation` or `-skipPackagePluginValidation` needed: none of the three packages ships macros or plugins.
- `-onlyUsePackageVersionsFromResolvedFile` for reproducible builds. `-only-testing:FrictionTests/PillPanelTests` for a subset.

---

## Part 5: Still unverified, prove during the build

1. `NSHostingSceneRepresentation` opening a `Window` scene (4.3).
2. SwiftUI `onHover` in a non-key panel of an inactive app (4.2); the tracking-area fallback is proven locally.
3. Automatic signing with a Developer ID identity (delta 10); the split config avoids the question.
4. `inngest/hono` `serve` reading `c.env` without `setEnvVars` (2.6); check `GET /api/inngest` in prod.
5. Zod 4 accepted by Inngest `eventType` (2.6); typecheck it first.
6. `@inngest/test` running `wrapRequest` with `reqArgs` (2.6).
7. Fake timers against `stream.sleep` in workerd (2.4); injectable pacing avoids the question.
8. Whether the org may create projects in `aws-us-east-1` (3.4).
