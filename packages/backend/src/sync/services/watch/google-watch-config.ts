import { getGcalWebhookBaseURL } from "@backend/common/constants/config.util";

export const isUsingGcalWebhookHttps = () =>
  getGcalWebhookBaseURL().startsWith("https://");
