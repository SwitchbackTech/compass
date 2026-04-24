import { ENV, getApiBaseURL } from "@backend/common/constants/env.constants";

export function getGcalWebhookBaseURL(): string {
  return ENV.GCAL_WEBHOOK_BASEURL ?? getApiBaseURL();
}
