import { Logger } from "@core/logger/winston.logger";
import dayjs from "@core/util/date/dayjs";
import { SYNC_BUFFER_DAYS } from "@backend/common/constants/backend.constants";
import { ENV } from "@backend/common/constants/env.constants";

const logger = Logger("app:google-watch-timing");

export const getChannelExpiration = (): string => {
  const numMin = parseInt(ENV.CHANNEL_EXPIRATION_MIN, 10);
  const expiration = dayjs().add(numMin, "minutes");

  logExpirationReminder(numMin);

  return expiration.valueOf().toString();
};

export const logExpirationReminder = (min: number) => {
  const hours = Math.round((min / 60) * 100) / 100;
  const days = Math.round((hours / 24) * 100) / 100;

  const label = hours > 24 ? `${days} days` : `${hours} hours`;
  logger.debug(`REMINDER: Channel will expire in ${min} minutes (${label})`);
};

export const syncExpired = (expiration: Date) => {
  return dayjs(expiration).isSameOrBefore(dayjs());
};

export const syncExpiresSoon = (expiration: Date) => {
  const deadline = dayjs().add(SYNC_BUFFER_DAYS, "days");

  return dayjs(expiration).isSameOrBefore(deadline);
};
