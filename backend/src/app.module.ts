import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./core/guards/jwt-auth.guard";
import { RolesGuard } from "./core/guards/roles.guard";
import { TenancyGuard } from "./core/guards/tenancy.guard";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { PropertiesModule } from "./modules/properties/properties.module";
import { TowersModule } from "./modules/towers/towers.module";
import { UnitsModule } from "./modules/units/units.module";
import { PeopleModule } from "./modules/people/people.module";
import { AuditModule } from "./modules/audit/audit.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { PaymentsModule } from "./modules/payments/payments.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Multiples policies de throttling. Cada @Throttle() en un endpoint puede
    // elegir cuál aplicar via @SkipThrottle / @Throttle({ short: ... }).
    // - default: 100 req/min por IP (todos los endpoints).
    // - strict : 10 req/min   (login).
    // - sensitive: 30 req/min (refresh, password reset, etc.).
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 100 },
      { name: "strict", ttl: 60_000, limit: 10 },
      { name: "sensitive", ttl: 60_000, limit: 30 },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    PropertiesModule,
    TowersModule,
    UnitsModule,
    PeopleModule,
    FinanceModule,
    PaymentsModule,
  ],
  providers: [
    // Orden de guards globales: Throttler -> Jwt -> Roles -> Tenancy.
    // El orden importa: Nest los ejecuta en el orden en que están aquí.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenancyGuard },
  ],
})
export class AppModule {}
