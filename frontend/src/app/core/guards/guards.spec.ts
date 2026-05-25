import { TestBed } from "@angular/core/testing";
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from "@angular/router";
import { authGuard } from "./auth.guard";
import { publicGuard } from "./public.guard";
import { roleGuard } from "./role.guard";
import { TokenService } from "../auth/token.service";
import { AuthStore } from "../auth/auth.store";
import { AuthUser } from "../auth/auth.models";

const route = {} as ActivatedRouteSnapshot;
const stateAt = (url: string) => ({ url }) as RouterStateSnapshot;
const userWith = (role: AuthUser["role"]): AuthUser => ({
  id: "u1",
  email: "u@adminph.com",
  fullName: "User",
  role,
  companyId: null,
});

function run<T>(fn: () => T): T {
  return TestBed.runInInjectionContext(fn);
}

describe("guards", () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  describe("authGuard", () => {
    it("permite el acceso con sesión", () => {
      TestBed.inject(TokenService).setTokens({ access_token: "a", refresh_token: "r" });
      expect(run(() => authGuard(route, stateAt("/app/x")))).toBe(true);
    });

    it("redirige a /login con returnUrl sin sesión", () => {
      const result = run(() => authGuard(route, stateAt("/app/x"))) as UrlTree;
      expect(result instanceof UrlTree).toBe(true);
      expect(result.toString()).toContain("/login");
      expect(result.toString()).toContain("returnUrl");
    });
  });

  describe("publicGuard", () => {
    it("permite sin sesión", () => {
      expect(run(() => publicGuard(route, stateAt("/login")))).toBe(true);
    });

    it("redirige al dashboard con sesión", () => {
      TestBed.inject(TokenService).setTokens({ access_token: "a", refresh_token: "r" });
      const result = run(() => publicGuard(route, stateAt("/login"))) as UrlTree;
      expect(result.toString()).toContain("/app/dashboard");
    });
  });

  describe("roleGuard", () => {
    it("permite si el rol está en la lista", () => {
      TestBed.inject(AuthStore).setUser(userWith("SUPERADMIN"));
      expect(run(() => roleGuard("SUPERADMIN", "COMPANY_ADMIN")(route, stateAt("/app/x")))).toBe(true);
    });

    it("redirige a /403 si el rol no está", () => {
      TestBed.inject(AuthStore).setUser(userWith("OWNER"));
      const result = run(() => roleGuard("SUPERADMIN")(route, stateAt("/app/x"))) as UrlTree;
      expect(result.toString()).toContain("/403");
    });
  });
});
