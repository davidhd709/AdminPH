import { HttpErrorResponse } from "@angular/common/http";
import { isTransientError } from "./session.init";

const httpError = (status: number) => new HttpErrorResponse({ status });

describe("isTransientError", () => {
  it("429 (rate limit) es transitorio: no debe invalidar la sesión", () => {
    expect(isTransientError(httpError(429))).toBe(true);
  });

  it("status 0 (red) y 5xx son transitorios", () => {
    expect(isTransientError(httpError(0))).toBe(true);
    expect(isTransientError(httpError(500))).toBe(true);
    expect(isTransientError(httpError(503))).toBe(true);
  });

  it("401 y 403 NO son transitorios (fallo de autenticación real)", () => {
    expect(isTransientError(httpError(401))).toBe(false);
    expect(isTransientError(httpError(403))).toBe(false);
  });

  it("404 no es transitorio", () => {
    expect(isTransientError(httpError(404))).toBe(false);
  });

  it("un error que no es HttpErrorResponse no es transitorio", () => {
    expect(isTransientError(new Error("boom"))).toBe(false);
    expect(isTransientError(null)).toBe(false);
  });
});
