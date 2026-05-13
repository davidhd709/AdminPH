import { NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class TenancyInterceptor implements NestInterceptor {
  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return next.handle();

    // Inject tenancy IDs into the request for services to use
    request.companyId = user.companyId;
    request.propertyId = user.propertyId; // This would be set by a PropertyGuard or Header

    return next.handle().pipe(
      tap(async () => {
        // Logic to automatically log changes if the request was a POST, PATCH, or DELETE
        if (["POST", "PATCH", "DELETE"].includes(request.method)) {
          // This is a simplified version; in a full implementation,
          // we would compare old and new values from the response.
        }
      }),
    );
  }
}
