import { ENV } from "./env.constants";

export const isMissingUserTagId = () => {
  return !ENV.EMAILER_SECRET || !ENV.EMAILER_USER_TAG_ID;
};

export const isMissingWaitlistTagId = () => {
  return !ENV.EMAILER_SECRET || !ENV.EMAILER_WAITLIST_TAG_ID;
};

export const isMissingWaitlistInviteTagId = () => {
  return !ENV.EMAILER_SECRET || !ENV.EMAILER_WAITLIST_INVITE_TAG_ID;
};
