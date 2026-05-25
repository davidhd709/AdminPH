import { TokenService } from "./token.service";

describe("TokenService", () => {
  let service: TokenService;

  beforeEach(() => {
    localStorage.clear();
    service = new TokenService();
  });

  it("no hay sesión al inicio", () => {
    expect(service.hasSession()).toBe(false);
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });

  it("setTokens guarda y los getters leen", () => {
    service.setTokens({ access_token: "acc", refresh_token: "ref" });
    expect(service.getAccessToken()).toBe("acc");
    expect(service.getRefreshToken()).toBe("ref");
    expect(service.hasSession()).toBe(true);
  });

  it("clear elimina ambos tokens", () => {
    service.setTokens({ access_token: "acc", refresh_token: "ref" });
    service.clear();
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.hasSession()).toBe(false);
  });
});
