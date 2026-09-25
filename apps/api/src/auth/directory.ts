// The fixed people directory: the only people who can act on the service until phase 02 lands sign-in.
// One file (packages/contracts/fixtures/fixed-directory.json) feeds both this and the Mac's person switcher.
import { Directory, type Me, type Person, type Role } from "@friction-telemetry/contracts";
import directoryJson from "@friction-telemetry/contracts/fixtures/fixed-directory.json";

export const DIRECTORY: Directory = Directory.parse(directoryJson);

export function findPerson(userId: string): Person | undefined {
  return DIRECTORY.people.find((p) => p.id === userId);
}

export function rolesOf(person: Person): Role[] {
  return person.leader ? ["employee", "leader"] : ["employee"];
}

export function meOf(person: Person): Me {
  const roles = rolesOf(person);
  return {
    person,
    organization: DIRECTORY.organization,
    roles,
    permissions: { initiativeSurface: roles.includes("leader"), workspaceAdmin: roles.includes("admin") },
  };
}
