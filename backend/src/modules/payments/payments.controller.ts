import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { PaymentGatewayService } from "./payment-gateway.service";
import { CreatePaymentDto, ApprovePaymentDto, RejectPaymentDto } from "./dto/payment.dto";
import { Roles } from "../../core/decorators/roles.decorator";
import { Public } from "../../core/decorators/public.decorator";
import { CurrentUser } from "../../core/decorators/current-user.decorator";

@ApiTags("payments")
@ApiBearerAuth()
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly gateway: PaymentGatewayService,
  ) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT", "OWNER", "RESIDENT")
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: any,
    @Body("request") request: any,
  ) {
    return this.paymentsService.createPayment(dto, user, request);
  }

  /** Crea una sesión de checkout en la pasarela para un pago existente. */
  @Post(":id/checkout")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN", "ACCOUNTANT", "OWNER", "RESIDENT")
  async checkout(@Param("id") id: string, @Body("amount") amount: number) {
    return this.gateway.createCheckout(id, Number(amount) || 0);
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

  /**
   * Webhook de la pasarela. @Public (no usa JWT) — se autentica por firma HMAC
   * sobre el cuerpo. Si el evento es "approved", aprueba el pago automáticamente.
   */
  @Public()
  @Post("webhook")
  async webhook(
    @Body() payload: { event?: string; paymentId?: string },
    @Headers("x-gateway-signature") signature: string,
  ) {
    const raw = JSON.stringify(payload);
    if (!this.gateway.verifyWebhookSignature(raw, signature)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }
    if (!payload.paymentId) {
      throw new BadRequestException("paymentId is required");
    }
    if (payload.event === "approved") {
      const result = await this.paymentsService.approveViaGateway(payload.paymentId);
      return { ok: true, status: result.payment.status };
    }
    return { ok: true, ignored: payload.event };
  }
}
