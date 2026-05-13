import { Controller, Post, Body, Patch, UseGuards } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto, ApprovePaymentDto, RejectPaymentDto } from "./dto/payment.dto";
import { JwtAuthGuard } from "../../core/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/guards/roles.guard";
import { Roles } from "../../core/decorators/roles.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";

@Controller("payments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT", "OWNER", "RESIDENT")
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: any,
    @Body("request") request: any,
  ) {
    return this.paymentsService.createPayment(dto, user, request);
  }

  @Patch("approve")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT")
  async approve(
    @Body() dto: ApprovePaymentDto,
    @CurrentUser() user: any,
    @Body("request") request: any,
  ) {
    return this.paymentsService.approvePayment(dto, user, request);
  }

  @Patch("reject")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT")
  async reject(
    @Body() dto: RejectPaymentDto,
    @CurrentUser() user: any,
    @Body("request") request: any,
  ) {
    return this.paymentsService.rejectPayment(dto, user, request);
  }
}
