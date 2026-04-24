import { ENV } from "@backend/common/constants/env.constants";

export function getApiBaseURL(): string {
  return ENV.BASEURL;
}
