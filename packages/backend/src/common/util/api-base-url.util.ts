import { ENV } from "@backend/common/constants/env.constants";

export function getApiBaseURL(): string {
  return ENV.BASEURL;
}

export function getGcalWebhookBaseURL(): string {
  return ENV.GCAL_WEBHOOK_BASEURL ?? ENV.BASEURL;
}
