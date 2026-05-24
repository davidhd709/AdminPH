import { createHmac, timingSafeEqual } from "crypto";
import { Injectable, Logger } from "@nestjs/common";

export interface CheckoutSession {
  checkoutUrl: string;
  reference: string;
  provider: string;
}

/**
 * Abstracción de pasarela de pagos (PSE / Wompi / ePayco).
 *
 * Implementación actual: **stub** — genera una URL de checkout simulada y
 * verifica la firma del webhook con HMAC-SHA256 sobre GATEWAY_WEBHOOK_SECRET.
 * Para producción, reemplazar `createCheckout` por la integración real del
 * proveedor (manteniendo la misma interface) y ajustar `verifyWebhookSignature`
 * al esquema de firma del proveedor.
 *
 * @see PLAN.md Fase 8.1 (pasarela) y 8.6 (webhook).
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly provider = process.env.PAYMENT_PROVIDER ?? "stub";
  private readonly webhookSecret = process.env.GATEWAY_WEBHOOK_SECRET ?? "dev-webhook-secret";

  createCheckout(paymentId: string, amount: number): CheckoutSession {
    // TODO(prod): llamar a la API del proveedor (Wompi/ePayco/PSE) y retornar
    // su checkoutUrl real. El stub devuelve una URL local de simulación.
    const reference = `ADMINPH-${paymentId}`;
    this.logger.log(`[gateway:${this.provider}] checkout creado ref=${reference} amount=${amount}`);
    return {
      provider: this.provider,
      reference,
      checkoutUrl: `https://checkout.${this.provider}.local/pay/${reference}`,
    };
  }

  /**
   * Verifica la firma del webhook. El proveedor firma el cuerpo crudo con un
   * secreto compartido; aquí se recomputa el HMAC y se compara en tiempo
   * constante. `rawBody` debe ser el cuerpo exacto recibido (string).
   */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
