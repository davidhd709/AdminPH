import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentGatewayService } from "./payment-gateway.service";
import { PaymentsController } from "./payments.controller";

@Module({
  providers: [PaymentsService, PaymentGatewayService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
