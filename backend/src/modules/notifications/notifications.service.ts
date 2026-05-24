import { Injectable, Logger } from "@nestjs/common";

export type NotificationChannel = "whatsapp" | "sms";

/**
 * Abstracción de notificaciones push/mensajería (WhatsApp Business API, SMS).
 *
 * Implementación actual: **stub** — loguea el mensaje. Para producción,
 * reemplazar `send` por la integración real (WhatsApp Cloud API / Twilio)
 * leyendo credenciales de env, manteniendo la misma interface. El email
 * transaccional va aparte en MailService (Fase 6.1/8.2).
 *
 * @see PLAN.md Fase 8.3.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly provider = process.env.WHATSAPP_PROVIDER ?? "stub";

  async send(channel: NotificationChannel, to: string, message: string): Promise<void> {
    // TODO(prod): integrar WhatsApp Cloud API / Twilio vía env
    // WHATSAPP_PROVIDER + WHATSAPP_TOKEN. El stub solo loguea.
    this.logger.log(`[notify:${this.provider}:${channel}] to=${to} :: ${message}`);
  }

  notifyPaymentApproved(phone: string, unitCode: string): Promise<void> {
    return this.send(
      "whatsapp",
      phone,
      `AdminPH: tu pago para la unidad ${unitCode} fue aprobado. ¡Gracias!`,
    );
  }

  notifyNewAnnouncement(phone: string, title: string): Promise<void> {
    return this.send("whatsapp", phone, `AdminPH: nuevo comunicado — ${title}`);
  }
}
