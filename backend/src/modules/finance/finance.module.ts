import { Module } from "@nestjs/common";
import { FeeConceptsService } from "./fee-concepts.service";
import { FeesService } from "./fees.service";
import { LateFeeService } from "./late-fee.service";
import { AccountStatementService } from "./account-statement.service";
import { AccountStatementController } from "./account-statement.controller";
import { FeeConceptsController } from "./fee-concepts.controller";
import { FeesController } from "./fees.controller";
import { LateFeeController } from "./late-fee.controller";

@Module({
  providers: [FeeConceptsService, FeesService, LateFeeService, AccountStatementService],
  controllers: [
    AccountStatementController,
    FeeConceptsController,
    FeesController,
    LateFeeController,
  ],
  exports: [FeesService, AccountStatementService],
})
export class FinanceModule {}
