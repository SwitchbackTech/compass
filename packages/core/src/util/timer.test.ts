import { ObjectId } from "bson";
import dayjs from "dayjs";
import { Timer } from "@core/util/timer";
import { waitUntilEvent } from "@core/util/wait-until-event.util";

describe("Timer", () => {
  const _id = new ObjectId();

  describe("initialization", () => {
    it("creates a timer with ObjectId, start, and end dates", () => {
      const startDate = dayjs().add(1, "second").toDate();
      const endDate = dayjs().add(5, "seconds").toDate();

      const timer = new Timer({ _id, startDate, endDate });

      expect(timer._id).toEqual(_id);
      expect(timer.startDate).toEqual(startDate);
      expect(timer.endDate).toEqual(endDate);

      timer.end();
    });

    it("throws error when end date is in the past", () => {
      const startDate = dayjs().subtract(1, "seconds").toDate();
      const endDate = dayjs(startDate).add(1, "second").toDate();

      expect(() => new Timer({ _id, startDate, endDate })).toThrow(
        "End date must be in the future",
      );
    });

    it("throws error when end date is before or equal to start date", () => {
      const startDate = dayjs().add(5, "seconds").toDate();
      const endDate = dayjs().add(1, "second").toDate();

      expect(() => new Timer({ _id, startDate, endDate })).toThrow(
        "Start date must be before End date",
      );
    });

    it("accepts custom interval in milliseconds", () => {
      const start = dayjs().add(1, "second").toDate();
      const end = dayjs().add(5, "seconds").toDate();

      const timer = new Timer({
        _id,
        startDate: start,
        endDate: end,
        interval: 500,
      });

      expect(timer).toBeDefined();

      timer.end();
    });
  });

  describe("start event", () => {
    it("emits start event when timer starts", (done) => {
      const startDate = dayjs().add(1, "seconds").toDate();
      const endDate = dayjs(startDate).add(1, "seconds").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 100,
      });

      waitUntilEvent(timer, "end", 5000, undefined, () =>
        Promise.resolve(done()),
      );

      waitUntilEvent(timer, "start", 2000);
    });

    it("does not start timer multiple times", (done) => {
      const startDate = dayjs().toDate();
      const endDate = dayjs().add(2, "seconds").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 100,
      });

      let startCount = 0;

      timer.on("start", () => {
        startCount++;
      });

      timer.start();
      timer.start();
      timer.start();

      waitUntilEvent(timer, "end", 3000, undefined, async () => {
        expect(startCount).toBe(1);
        done();
      });
    });

    it("emits start event automatically when start date is reached", (done) => {
      const startDate = dayjs().add(150, "millisecond").toDate();
      const endDate = dayjs(startDate).add(300, "millisecond").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 100,
      });

      waitUntilEvent(timer, "end", 5000, undefined, () =>
        Promise.resolve(done()),
      );

      waitUntilEvent(timer, "start", 500);
    });

    it("allows manual start before scheduled start date", (done) => {
      const startDate = dayjs().add(3, "second").toDate();
      const endDate = dayjs(startDate).add(1, "second").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 100,
      });

      waitUntilEvent(timer, "end", 5000, undefined, () =>
        Promise.resolve(done()),
      );

      waitUntilEvent(timer, "start", 500, undefined, async () => {
        expect(dayjs().isBefore(startDate)).toBe(true);
      });

      timer.start();
    });
  });

  describe("tick event", () => {
    it("emits tick events at specified interval", async () => {
      const startDate = dayjs().add(1, "seconds").toDate();
      const endDate = dayjs(startDate).add(1, "second").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 200,
      });

      const ticks: number[] = [];

      timer.on("tick", (interval: number) => {
        ticks.push(interval);
      });

      await waitUntilEvent(timer, "end", 2000);

      expect(ticks).toHaveLength(5); // Expect approximately 5 ticks in 1 second at 200ms interval
    });

    it("emits tick with number type", async () => {
      const startDate = dayjs().add(1, "seconds").toDate();
      const endDate = dayjs(startDate).add(1, "second").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 200,
      });

      const ticks: number[] = [];

      timer.on("tick", (interval: number) => {
        ticks.push(interval);
      });

      timer.start();

      await waitUntilEvent(timer, "end", 2000);

      expect(ticks.every((tick) => typeof tick === "number")).toBe(true);
    });

    it("emits tick with interval values", async () => {
      const startDate = dayjs().add(1, "seconds").toDate();
      const endDate = dayjs(startDate).add(1, "second").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 200,
      });

      const ticks: number[] = [];

      timer.on("tick", (interval: number) => {
        ticks.push(interval);
      });

      timer.start();

      await waitUntilEvent(timer, "end", 2000);

      expect(ticks).toEqual(expect.arrayContaining([0, 1, 2, 3, 4]));
    });
  });

  describe("end event", () => {
    it("emits end event when timer completes", (done) => {
      const startDate = dayjs().toDate();
      const endDate = dayjs().add(500, "milliseconds").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 100,
      });

      timer.on("end", done);

      timer.start();
    });

    it("can be ended manually before end date", (done) => {
      const startDate = dayjs().toDate();
      const endDate = dayjs().add(5, "seconds").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 100,
      });

      timer.on("end", () => {
        expect(dayjs().isBefore(endDate)).toBe(true);
        done();
      });

      timer.start();

      setTimeout(() => timer.end(), 500);
    });

    it("emits end event even if ended before the start date is reached", (done) => {
      const startDate = dayjs().add(1, "second").toDate();
      const endDate = dayjs(startDate).add(1, "second").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 100,
      });

      timer.on("end", () => {
        expect(dayjs().isBefore(startDate)).toBe(true);
        expect(dayjs().isBefore(endDate)).toBe(true);
        done();
      });

      timer.end();
    });

    it("ends timer on end date", (done) => {
      const startDate = dayjs().add(1, "second").toDate();
      const endDate = dayjs(startDate).add(1, "second").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 100,
      });

      timer.on("end", () => {
        expect(dayjs().isSame(endDate)).toBe(true);
        done();
      });
    });
  });
});
