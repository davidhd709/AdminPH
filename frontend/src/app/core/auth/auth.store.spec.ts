import { AuthStore } from "./auth.store";
import { AuthUser } from "./auth.models";

const SUPER: AuthUser = {
  id: "u1",
  email: "admin@adminph.com",
  fullName: "Super Admin",
  role: "SUPERADMIN",
  companyId: null,
};

describe("AuthStore", () => {
  let store: AuthStore;

  beforeEach(() => {
    store = new AuthStore();
  });

  it("arranca sin autenticar", () => {
    expect(store.isAuthenticated()).toBe(false);
    expect(store.role()).toBeNull();
    expect(store.companyId()).toBeNull();
    expect(store.hasRole("SUPERADMIN")).toBe(false);
  });

  it("setUser puebla el estado derivado", () => {
    store.setUser(SUPER);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.role()).toBe("SUPERADMIN");
    expect(store.user()?.email).toBe("admin@adminph.com");
  });

  it("hasRole acepta varios roles", () => {
    store.setUser({ ...SUPER, role: "COMPANY_ADMIN", companyId: "co-1" });
    expect(store.companyId()).toBe("co-1");
    expect(store.hasRole("SUPERADMIN", "COMPANY_ADMIN")).toBe(true);
    expect(store.hasRole("OWNER", "RESIDENT")).toBe(false);
  });

  it("clear resetea el estado", () => {
    store.setUser(SUPER);
    store.clear();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.role()).toBeNull();
  });
});
