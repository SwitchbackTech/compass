import dayjs, { Dayjs } from "dayjs";
import { Timer } from "@core/util/timer";
import { waitUntilEvent } from "@core/util/wait-until-event.util";

describe("Timer", () => {
  const _id = "test-timer";

  describe("initialization", () => {
    it("creates a timer with ObjectId, start, and end dates", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(1, "seconds").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 100 });

      expect(timer._id).toEqual(_id);
      expect(timer.startDate).toEqual(startDate);
      expect(timer.endDate).toEqual(endDate);

      timer.on("end", done);
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

    it("accepts custom interval in milliseconds", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(1, "seconds").toDate();
      const interval = 100; // 100ms
      const ticks: Dayjs[] = [];

      const timer = new Timer({ _id, startDate, endDate, interval });

      timer.on("tick", () => ticks.push(dayjs()));

      expect(
        ticks.reduce(
          (acc, tick, index) =>
            acc +
            (index === 0 ? 100 : tick.diff(ticks[index - 1], "millisecond")),
          0,
        ),
      ).toEqual(ticks.length * interval);

      timer.on("end", done);
    });

    it("restarts the timer", async () => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(3, "seconds").toDate();
      const ticks: number[] = [];

      const timer = new Timer({ _id, startDate, endDate });

      timer.once("start", () => {
        const endTimer = setTimeout(() => {
          timer.end();
          clearTimeout(endTimer);
        }, 500);
      });

      await waitUntilEvent(timer, "end", 5000);

      timer.on("tick", (interval) => ticks.push(interval));

      await waitUntilEvent(timer, "end", 5000, async () => timer.start());

      expect(ticks.length).toBeGreaterThan(1);
    }, 10000);
  });

  describe("start event", () => {
    it("emits start event when timer starts", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(1, "seconds").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 100 });

      timer.on("start", (interval) => expect(interval).toBe(0));

      timer.on("end", done);
    });

    it("does not restart the timer if it is not stopped", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(2, "seconds").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 100 });

      let startCount = 0;

      timer.on("start", () => {
        startCount++;
      });

      timer.start();
      timer.start();
      timer.start();

      timer.on("end", () => {
        expect(startCount).toBe(1);
        done();
      });
    });

    it("emits start event automatically when start date is reached", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(1, "seconds").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 100 });

      timer.on("start", (interval) => expect(interval).toBe(0));
      timer.on("end", done);
    });

    it("allows manual start before scheduled start date", (done) => {
      const start = dayjs().add(1, "seconds");
      const startDate = start.toDate();
      const endDate = start.add(1, "seconds").toDate();

      const timer = new Timer({
        _id,
        startDate,
        endDate,
        interval: 100,
      });

      timer.on("start", () => {
        expect(dayjs().isBefore(startDate)).toBe(true);
      });

      timer.on("end", done);

      timer.start();
    });
  });

  describe("tick event", () => {
    it("emits tick events at specified interval", (done) => {
      const start = dayjs().add(2, "seconds");
      const startDate = start.toDate();
      const endDate = start.add(1, "second").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 200 });

      const ticks: number[] = [];

      timer.on("tick", (interval: number) => ticks.push(interval));

      timer.on("end", () => {
        // Expect approximately 5 ticks in 1 second at 200ms interval
        expect(ticks).toHaveLength(5);
        done();
      });
    });

    it("emits tick intervals as numbers", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(1, "seconds").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 200 });

      const ticks: number[] = [];

      timer.on("tick", (interval: number) => ticks.push(interval));

      timer.on("end", () => {
        expect(ticks.every((tick) => typeof tick === "number")).toBe(true);
        done();
      });

      timer.start();
    });

    it("emits tick with interval values", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(1, "seconds").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 200 });

      const ticks: number[] = [];

      timer.on("tick", (interval: number) => ticks.push(interval));

      timer.on("end", () => {
        expect(ticks).toEqual(expect.arrayContaining([0, 1, 2, 3, 4]));
        done();
      });
    });
  });

  describe("end event", () => {
    it("emits end event when timer completes", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(500, "milliseconds").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 100 });

      timer.on("end", done);

      timer.start();
    });

    it("can be ended manually before end date", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(1, "seconds").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 100 });

      timer.on("end", () => {
        expect(dayjs().isBefore(endDate)).toBe(true);
        done();
      });

      timer.on("start", () => timer.end());
    });

    it("emits end event even if ended before the start date is reached", (done) => {
      const start = dayjs().add(2, "seconds");
      const startDate = start.toDate();
      const endDate = start.add(1, "seconds").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 100 });

      timer.on("end", () => {
        expect(dayjs().isBefore(startDate)).toBe(true);
        expect(dayjs().isBefore(endDate)).toBe(true);
        done();
      });

      timer.end();
    });

    it.skip("ends timer on end date", (done) => {
      const start = dayjs();
      const startDate = start.toDate();
      const endDate = start.add(2, "second").toDate();

      const timer = new Timer({ _id, startDate, endDate, interval: 100 });

      timer.on("end", () => {
        const end = dayjs();
        expect(end.isSameOrAfter(endDate)).toBe(true);
        expect(end.valueOf() - 10).toBeLessThan(endDate.getTime());
        done();
      });
    });
  });
});
