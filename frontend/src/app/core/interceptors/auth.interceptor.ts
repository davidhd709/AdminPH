import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { TokenService } from "../auth/token.service";
import { API } from "../config/api.config";

/** Endpoints que NO deben llevar el access token. */
const SKIP_AUTH = [API.auth.login, API.auth.refresh, API.auth.forgotPassword, API.auth.resetPassword];

/** Agrega `Authorization: Bearer <token>` a las requests autenticadas. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);

  const isApi = req.url.startsWith(API.baseUrl);
  const isSkipped = SKIP_AUTH.some((path) => req.url.endsWith(path));
  const accessToken = tokens.getAccessToken();

  if (isApi && !isSkipped && accessToken) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    });
  }

  return next(req);
};
