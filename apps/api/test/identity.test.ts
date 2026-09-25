import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { LEADER_ROUTES } from "../src/auth/gates";

const ID = "6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f";
const call = (method: string, path: string, userId?: string) =>
  exports.default.fetch(`http://api.test${path}`, { method, headers: userId ? { "x-ft-user": userId } : {} });

const ORG = { id: "org_acme", name: "Acme Logistics" };

describe("who is acting", () => {
  it("given no x-ft-user header, then 401 actor_required and no data", async () => {
    const res = await call("GET", "/v1/me");
    expect(res.status).toBe(401);
    expect(await res.json()).toStrictEqual({ error: "actor_required", message: "Send the x-ft-user header naming who is acting." });
  });

  it("given a person outside the fixed directory (the old sample employee), then 401 unknown_person", async () => {
    const res = await call("GET", "/v1/me", "usr_sam");
    expect(res.status).toBe(401);
    expect(await res.json()).toStrictEqual({ error: "unknown_person", message: "usr_sam is not in the Acme Logistics directory." });
  });

  it("given Romina, then /v1/me is Romina as an employee without the initiative surface", async () => {
    const res = await call("GET", "/v1/me", "usr_romina");
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({
      person: { id: "usr_romina", name: "Romina", email: "romina@acmelogistics.com", title: null, leader: false },
      organization: ORG,
      roles: ["employee"],
      permissions: { initiativeSurface: false, workspaceAdmin: false },
    });
  });

  it("given Andrés, then /v1/me is Andrés as a leader with the initiative surface", async () => {
    const res = await call("GET", "/v1/me", "usr_andres");
    expect(await res.json()).toStrictEqual({
      person: { id: "usr_andres", name: "Andrés Campos", email: "andres@acmelogistics.com", title: "Project Manager", leader: true },
      organization: ORG,
      roles: ["employee", "leader"],
      permissions: { initiativeSurface: true, workspaceAdmin: false },
    });
  });

  it("given Amir, then /v1/me is Amir as a leader with the initiative surface", async () => {
    const res = await call("GET", "/v1/me", "usr_amir");
    expect(await res.json()).toStrictEqual({
      person: { id: "usr_amir", name: "Amir", email: "amir@acmelogistics.com", title: "Executive", leader: true },
      organization: ORG,
      roles: ["employee", "leader"],
      permissions: { initiativeSurface: true, workspaceAdmin: false },
    });
  });

  it("given no header, then /v1/health still answers, because uptime checks carry no identity", async () => {
    const res = await call("GET", "/v1/health");
    expect(res.status).toBe(200);
  });
});

describe("leader gates", () => {
  const concrete = (path: string) => path.replace(":id", ID);

  for (const [method, path] of LEADER_ROUTES) {
    it(`given Romina (employee), when ${method} ${path}, then 403 role_required leader`, async () => {
      const res = await call(method, concrete(path), "usr_romina");
      expect(res.status).toBe(403);
      expect(await res.json()).toStrictEqual({ error: "role_required", message: "This needs the leader role.", role: "leader" });
    });

    it(`given Andrés (leader), when ${method} ${path}, then the gate lets him through`, async () => {
      const res = await call(method, concrete(path), "usr_andres");
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  }

  it("given Amir (leader), when he reads the people directory, then he gets exactly the three people", async () => {
    const res = await call("GET", "/v1/people", "usr_amir");
    expect(res.status).toBe(200);
    expect(((await res.json()) as Array<{ id: string }>).map((p) => p.id)).toStrictEqual(["usr_andres", "usr_romina", "usr_amir"]);
  });

  it("given Romina, when she lists initiatives, then she is not gated, because employees need their initiatives for Ask", async () => {
    const res = await call("GET", "/v1/initiatives", "usr_romina");
    expect(res.status).toBe(200);
  });
});
