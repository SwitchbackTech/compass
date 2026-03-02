import { ENV } from "./env.constants";

export const isMissingUserTagId = () => {
  return !ENV.EMAILER_SECRET || !ENV.EMAILER_USER_TAG_ID;
};
