import { CONFIG } from "@backend/common/constants/config.constants";

export const isUsingGcalWebhookHttps = () =>
  CONFIG.GCAL_WEBHOOK_BASEURL.startsWith("https://");
