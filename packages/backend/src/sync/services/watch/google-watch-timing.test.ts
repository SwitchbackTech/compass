import { faker } from "@faker-js/faker";
import dayjs from "@core/util/date/dayjs";
import { CONFIG } from "@backend/common/constants/config.constants";
import {
  getChannelExpiration,
  syncExpired,
  syncExpiresSoon,
} from "@backend/sync/services/watch/google-watch-timing";

describe("googleWatchTiming", () => {
  describe("getChannelExpiration", () => {
    it("returns an epoch-ms timestamp CONFIG.CHANNEL_EXPIRATION_MIN minutes from now", () => {
      // Reads the value straight off CONFIG rather than hardcoding either
      // the prod default (10080) or the test env's override (backend.test
      // .init.ts sets "5") - see config.constants.test.ts for the pin on
      // what the default itself resolves to.
      const numMin = Number(CONFIG.CHANNEL_EXPIRATION_MIN);
      const before = dayjs().add(numMin, "minutes").valueOf();

      const expiration = Number(getChannelExpiration());

      const after = dayjs().add(numMin, "minutes").valueOf();

      expect(expiration).toBeGreaterThanOrEqual(before);
      expect(expiration).toBeLessThanOrEqual(after);
    });
  });

  describe("syncExpired", () => {
    it("returns true if expiry before now", () => {
      const expired = dayjs("1675097074000").toDate(); // Jan 30, 2023
      const isExpired = syncExpired(expired);

      expect(isExpired).toBe(true);
    });

    it("returns false if expiry after now", () => {
      const notExpired = faker.date.future({ years: 10 });
      const isExpired = syncExpired(notExpired);

      expect(isExpired).toBe(false);
    });
  });

  describe("syncExpiresSoon", () => {
    it("returns true when expiration is close", () => {
      const oneMinuteFromNow = dayjs().add(1, "minute").toDate();
      const expiresSoon = syncExpiresSoon(oneMinuteFromNow);

      expect(expiresSoon).toBe(true);
    });

    it("returns false when expiration is far away", () => {
      const manyDaysFromNow = faker.date.future({ years: 10 });
      const expiresSoon = syncExpiresSoon(manyDaysFromNow);

      expect(expiresSoon).toBe(false);
    });
  });
});
