import { ObjectId } from "bson";
import dayjs from "dayjs";
import { Duration, Timer } from "./timer";

describe("Timer", () => {
  let timer: Timer;
  const testId = new ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (timer) {
      timer.stop();
    }
  });

  describe("initialization", () => {
    it("creates a timer with ObjectId, start, and stop dates", () => {
      const start = dayjs().add(1, "second").toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop);

      expect(timer.id).toEqual(testId);
      expect(timer.startDate).toEqual(start);
      expect(timer.stopDate).toEqual(stop);
    });

    it("creates a timer with string id", () => {
      const start = dayjs().add(1, "second").toDate();
      const stop = dayjs().add(5, "seconds").toDate();
      const stringId = testId.toString();

      timer = new Timer(stringId, start, stop);

      expect(timer.id.toString()).toEqual(stringId);
    });

    it("throws error when stop date is before or equal to start date", () => {
      const start = dayjs().add(5, "seconds").toDate();
      const stop = dayjs().add(1, "second").toDate();

      expect(() => {
        timer = new Timer(testId, start, stop);
      }).toThrow("Stop date must be after start date");
    });

    it("accepts custom interval in milliseconds", () => {
      const start = dayjs().add(1, "second").toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 500);

      expect(timer).toBeDefined();
    });
  });

  describe("start event", () => {
    it("emits start event once when timer starts", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(2, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      let startCount = 0;
      timer.on("start", () => {
        startCount++;
      });

      timer.start();

      setTimeout(() => {
        expect(startCount).toBe(1);
        done();
      }, 500);
    });

    it("does not start timer multiple times", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(2, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      let startCount = 0;
      timer.on("start", () => {
        startCount++;
      });

      timer.start();
      timer.start();
      timer.start();

      setTimeout(() => {
        expect(startCount).toBe(1);
        done();
      }, 500);
    });
  });

  describe("tick event", () => {
    it("emits tick events at specified interval", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(1, "second").toDate();

      timer = new Timer(testId, start, stop, 200);

      const ticks: Duration[] = [];
      timer.on("tick", (duration: Duration) => {
        ticks.push(duration);
      });

      timer.start();

      setTimeout(() => {
        expect(ticks.length).toBeGreaterThanOrEqual(3);
        done();
      }, 800);
    });

    it("emits tick with proper duration types", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(2, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      timer.on("tick", (duration: Duration) => {
        expect(duration).toHaveProperty("milliseconds");
        expect(duration).toHaveProperty("seconds");
        expect(duration).toHaveProperty("minutes");
        expect(duration).toHaveProperty("hours");
        expect(typeof duration.milliseconds).toBe("number");
        expect(typeof duration.seconds).toBe("number");
        expect(typeof duration.minutes).toBe("number");
        expect(typeof duration.hours).toBe("number");
        done();
      });

      timer.start();
    });

    it("emits tick with decreasing time remaining", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(2, "seconds").toDate();

      timer = new Timer(testId, start, stop, 200);

      const durations: Duration[] = [];
      timer.on("tick", (duration: Duration) => {
        durations.push(duration);
      });

      timer.start();

      setTimeout(() => {
        expect(durations.length).toBeGreaterThanOrEqual(2);
        // Time remaining should decrease
        for (let i = 1; i < durations.length; i++) {
          expect(durations[i].milliseconds).toBeLessThanOrEqual(
            durations[i - 1].milliseconds,
          );
        }
        done();
      }, 1000);
    });
  });

  describe("stop event", () => {
    it("emits stop event when timer completes", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(500, "milliseconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      timer.on("stop", () => {
        done();
      });

      timer.start();
    });

    it("emits stop event only once", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(500, "milliseconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      let stopCount = 0;
      timer.on("stop", () => {
        stopCount++;
      });

      timer.start();

      setTimeout(() => {
        expect(stopCount).toBe(1);
        done();
      }, 1000);
    });

    it("can be stopped manually before stop date", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      timer.on("stop", () => {
        done();
      });

      timer.start();

      setTimeout(() => {
        timer.stop();
      }, 500);
    });
  });

  describe("pause and resume events", () => {
    it("emits pause event when paused", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      timer.on("pause", () => {
        done();
      });

      timer.start();

      setTimeout(() => {
        timer.pause();
      }, 300);
    });

    it("emits resume event when resumed", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      timer.on("resume", () => {
        done();
      });

      timer.start();

      setTimeout(() => {
        timer.pause();
        setTimeout(() => {
          timer.resume();
        }, 200);
      }, 300);
    });

    it("does not emit pause when not running", () => {
      const start = dayjs().add(1, "second").toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      let pauseCount = 0;
      timer.on("pause", () => {
        pauseCount++;
      });

      timer.pause();

      expect(pauseCount).toBe(0);
    });

    it("does not emit resume when not paused", () => {
      const start = dayjs().toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      let resumeCount = 0;
      timer.on("resume", () => {
        resumeCount++;
      });

      timer.start();
      timer.resume();

      setTimeout(() => {
        expect(resumeCount).toBe(0);
        timer.stop();
      }, 300);
    });

    it("stops emitting tick events when paused", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      let ticksBeforePause = 0;
      let ticksAfterPause = 0;
      let isPaused = false;

      timer.on("tick", () => {
        if (!isPaused) {
          ticksBeforePause++;
        } else {
          ticksAfterPause++;
        }
      });

      timer.start();

      setTimeout(() => {
        timer.pause();
        isPaused = true;

        setTimeout(() => {
          expect(ticksBeforePause).toBeGreaterThan(0);
          expect(ticksAfterPause).toBe(0);
          done();
        }, 500);
      }, 300);
    });
  });

  describe("custom event listeners", () => {
    it("allows adding custom event listeners with after method", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      timer.after("customEvent", () => {
        done();
      });

      timer.emit("customEvent");
    });

    it("prevents adding custom listeners for built-in events with after", () => {
      const start = dayjs().toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      expect(() => {
        timer.after("start", () => {});
      }).toThrow("Cannot add custom listeners for built-in event: start");

      expect(() => {
        timer.after("stop", () => {});
      }).toThrow("Cannot add custom listeners for built-in event: stop");

      expect(() => {
        timer.after("pause", () => {});
      }).toThrow("Cannot add custom listeners for built-in event: pause");

      expect(() => {
        timer.after("resume", () => {});
      }).toThrow("Cannot add custom listeners for built-in event: resume");

      expect(() => {
        timer.after("tick", () => {});
      }).toThrow("Cannot add custom listeners for built-in event: tick");
    });

    it("prevents adding custom listeners for built-in events with every", () => {
      const start = dayjs().toDate();
      const stop = dayjs().add(5, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      expect(() => {
        timer.every("start", 1000, () => {});
      }).toThrow("Cannot add custom listeners for built-in event: start");
    });
  });

  describe("event listener management", () => {
    it("allows using on method for built-in events", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(1, "second").toDate();

      timer = new Timer(testId, start, stop, 100);

      timer.on("start", () => {
        done();
      });

      timer.start();
    });

    it("allows using once method for built-in events", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(2, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      let count = 0;
      timer.once("tick", () => {
        count++;
      });

      timer.start();

      setTimeout(() => {
        expect(count).toBe(1);
        done();
      }, 500);
    });

    it("allows using off method to remove listeners", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(2, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      const listener = jest.fn();
      timer.on("tick", listener);

      timer.start();

      setTimeout(() => {
        const callsBeforeOff = listener.mock.calls.length;
        timer.off("tick", listener);

        setTimeout(() => {
          expect(listener.mock.calls.length).toBe(callsBeforeOff);
          done();
        }, 300);
      }, 300);
    });
  });

  describe("single timer per instance", () => {
    it("maintains only one timer per instance", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(3, "seconds").toDate();

      timer = new Timer(testId, start, stop, 100);

      let startCount = 0;
      timer.on("start", () => {
        startCount++;
      });

      timer.start();
      timer.start();
      timer.start();

      setTimeout(() => {
        expect(startCount).toBe(1);
        done();
      }, 500);
    });
  });

  describe("edge cases", () => {
    it("handles timer that has already expired", (done) => {
      const start = dayjs().subtract(5, "seconds").toDate();
      const stop = dayjs().subtract(1, "second").toDate();

      timer = new Timer(testId, start, stop, 100);

      timer.on("stop", () => {
        done();
      });

      timer.start();
    });

    it("handles immediate start and stop", (done) => {
      const start = dayjs().toDate();
      const stop = dayjs().add(100, "milliseconds").toDate();

      timer = new Timer(testId, start, stop, 50);

      let startEmitted = false;
      let stopEmitted = false;

      timer.on("start", () => {
        startEmitted = true;
      });

      timer.on("stop", () => {
        stopEmitted = true;
        expect(startEmitted).toBe(true);
        done();
      });

      timer.start();
    });
  });
});
