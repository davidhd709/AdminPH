import { HttpClient, provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { MessageService } from "primeng/api";
import { authInterceptor } from "./auth.interceptor";
import { errorInterceptor } from "./error.interceptor";
import { TokenService } from "../auth/token.service";
import { API } from "../config/api.config";

describe("authInterceptor", () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it("agrega Bearer en requests a la API con token", () => {
    TestBed.inject(TokenService).setTokens({ access_token: "tok", refresh_token: "r" });
    http.get(`${API.baseUrl}${API.companies}`).subscribe();
    const req = httpMock.expectOne(`${API.baseUrl}${API.companies}`);
    expect(req.request.headers.get("Authorization")).toBe("Bearer tok");
    req.flush({});
  });

  it("NO agrega Bearer en el login (endpoint excluido)", () => {
    TestBed.inject(TokenService).setTokens({ access_token: "tok", refresh_token: "r" });
    http.post(`${API.baseUrl}${API.auth.login}`, {}).subscribe();
    const req = httpMock.expectOne(`${API.baseUrl}${API.auth.login}`);
    expect(req.request.headers.has("Authorization")).toBe(false);
    req.flush({});
  });

  it("NO agrega Bearer si no hay token", () => {
    http.get(`${API.baseUrl}${API.companies}`).subscribe();
    const req = httpMock.expectOne(`${API.baseUrl}${API.companies}`);
    expect(req.request.headers.has("Authorization")).toBe(false);
    req.flush({});
  });
});

describe("errorInterceptor", () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
      ],
    });
  });

  it("ante un 401 limpia la sesión y navega a /login", () => {
    const tokens = TestBed.inject(TokenService);
    tokens.setTokens({ access_token: "a", refresh_token: "r" });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, "navigate").mockResolvedValue(true);
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    http.get(`${API.baseUrl}${API.users.me}`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${API.baseUrl}${API.users.me}`)
      .flush("no autorizado", { status: 401, statusText: "Unauthorized" });

    expect(tokens.hasSession()).toBe(false);
    expect(navSpy).toHaveBeenCalledWith(["/login"]);
    httpMock.verify();
  });
});
