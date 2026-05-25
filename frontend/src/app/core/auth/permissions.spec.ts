import { ALL_ROLES } from "./auth.models";
import { ROLE_PERMISSIONS, roleHasPermission } from "./permissions";

describe("roleHasPermission", () => {
  it("SUPERADMIN puede gestionar empresas", () => {
    expect(roleHasPermission("SUPERADMIN", "companies.manage")).toBe(true);
  });

  it("RESIDENT no puede gestionar empresas", () => {
    expect(roleHasPermission("RESIDENT", "companies.manage")).toBe(false);
  });

  it("solo SUPERADMIN tiene companies.manage", () => {
    const withPerm = ALL_ROLES.filter((r) => roleHasPermission(r, "companies.manage"));
    expect(withPerm).toEqual(["SUPERADMIN"]);
  });

  it("todos los roles ven el dashboard", () => {
    for (const role of ALL_ROLES) {
      expect(roleHasPermission(role, "dashboard.view")).toBe(true);
    }
  });

  it("ROLE_PERMISSIONS cubre los 7 roles", () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([...ALL_ROLES].sort());
  });
});
