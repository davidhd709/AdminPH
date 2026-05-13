import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
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
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
