import { ENV } from "@backend/common/constants/env.constants";

export function getBaseURL(): string {
  const serverNgrokURL = process.env["NGROK_DOMAIN_FULL"];
  const envNgrokURL = ENV.NGROK_DOMAIN ? `https://${ENV.NGROK_DOMAIN}` : null;
  const ngrokURL = serverNgrokURL ?? envNgrokURL;

  return ngrokURL ? `${ngrokURL}/api` : ENV.BASEURL;
}
