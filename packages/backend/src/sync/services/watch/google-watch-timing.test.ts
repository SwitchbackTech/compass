import { faker } from "@faker-js/faker";
import dayjs from "@core/util/date/dayjs";
import {
  syncExpired,
  syncExpiresSoon,
} from "@backend/sync/services/watch/google-watch-timing";

describe("googleWatchTiming", () => {
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
