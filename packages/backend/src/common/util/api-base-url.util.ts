import { ENV } from "@backend/common/constants/env.constants";

export function getApiBaseURL(): string {
  if (!ENV.BASEURL?.trim()) {
    throw new Error("ENV.BASEURL is not set");
  }

  return ENV.BASEURL;
}
