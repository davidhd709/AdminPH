import { Injectable, Logger } from "@nestjs/common";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Abstracción de envío de email.
 *
 * Implementación actual: "log transport" — escribe el email en el logger en
 * vez de enviarlo. Sirve para dev y CI sin proveedor externo.
 *
 * Para producción: reemplazar `send()` por una integración real (Resend /
 * SendGrid / Mailgun / SMTP) detrás de la misma interface. El resto del
 * código (auth, password reset) no cambia.
 *
 * @see PLAN.md Fase 8.2 (email transaccional).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(message: MailMessage): Promise<void> {
    // TODO(Fase 8.2): conectar proveedor real vía env MAIL_PROVIDER/MAIL_API_KEY.
    this.logger.log(
      `[MAIL:log-transport] to=${message.to} subject="${message.subject}" :: ${message.text}`,
    );
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: "AdminPH — Restablecer contraseña",
      text: `Para restablecer tu contraseña visita: ${resetUrl} (válido 1 hora).`,
    });
  }

  async sendEmailVerification(to: string, verifyUrl: string): Promise<void> {
    await this.send({
      to,
      subject: "AdminPH — Verifica tu correo",
      text: `Confirma tu correo visitando: ${verifyUrl} (válido 24 horas).`,
    });
  }
}
