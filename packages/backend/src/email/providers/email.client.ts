import { type Config } from "@backend/common/constants/config.constants";
import { type EmailProvider } from "@backend/email/providers/email.port";
import { createLogEmailProvider } from "@backend/email/providers/log.provider";
import { createResendEmailProvider } from "@backend/email/providers/resend.provider";

export type EmailConfigSlice = Pick<
  Config,
  | "EMAIL_PROVIDER"
  | "EMAIL_API_KEY"
  | "EMAIL_FROM"
  | "EMAIL_WEBHOOK_SECRET"
  | "EMAIL_UNSUBSCRIBE_SECRET"
>;

export function buildEmailProvider(env: EmailConfigSlice): EmailProvider {
  if (
    env.EMAIL_PROVIDER === "resend" &&
    env.EMAIL_API_KEY &&
    env.EMAIL_FROM &&
    env.EMAIL_WEBHOOK_SECRET
  ) {
    return createResendEmailProvider({
      apiKey: env.EMAIL_API_KEY,
      from: withSenderDisplayName(env.EMAIL_FROM, EMAIL_SENDER_DISPLAY_NAME),
      replyTo: EMAIL_REPLY_TO,
      webhookSecret: env.EMAIL_WEBHOOK_SECRET,
    });
  }
  return createLogEmailProvider();
}

/** Display name on every outgoing email; the address still comes from EMAIL_FROM. */
export const EMAIL_SENDER_DISPLAY_NAME = "Tyler from Compass";

/** Replies to any outgoing email land in Tyler's inbox instead of the Resend-only sending domain. */
export const EMAIL_REPLY_TO = "tyler@keepsoftwaresimple.com";

/** Replace any display name in `from` ("Name <a@b>" or "a@b") with `displayName`. */
export function withSenderDisplayName(
  from: string,
  displayName: string,
): string {
  const match = from.match(/<([^>]+)>/);
  const address = (match?.[1] ?? from).trim();
  return `${displayName} <${address}>`;
}
