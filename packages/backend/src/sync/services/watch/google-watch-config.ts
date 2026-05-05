import { getGcalWebhookBaseURL } from "@backend/common/util/api-base-url.util";

export const isUsingGcalWebhookHttps = () =>
  getGcalWebhookBaseURL().startsWith("https://");
