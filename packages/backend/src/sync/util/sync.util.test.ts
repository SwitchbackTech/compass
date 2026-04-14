import { createConcurrencyLimiter } from "@backend/sync/util/sync.util";

const waitForLimiterQueue = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("sync.util", () => {
  describe("createConcurrencyLimiter", () => {
    it("limits concurrent task execution", async () => {
      const limit = createConcurrencyLimiter(2);
      let activeCount = 0;
      let maxActiveCount = 0;
      const releaseTask: Array<() => void> = [];
      const started: number[] = [];

      const results = [0, 1, 2, 3].map((taskId) =>
        limit(async () => {
          started.push(taskId);
          activeCount += 1;
          maxActiveCount = Math.max(maxActiveCount, activeCount);

          await new Promise<void>((resolve) => {
            releaseTask.push(resolve);
          });

          activeCount -= 1;

          return taskId;
        }),
      );

      await waitForLimiterQueue();

      expect(started).toEqual([0, 1]);
      expect(activeCount).toBe(2);
      expect(maxActiveCount).toBe(2);

      releaseTask[0]?.();
      await results[0];
      await waitForLimiterQueue();

      expect(started).toEqual([0, 1, 2]);
      expect(activeCount).toBe(2);
      expect(maxActiveCount).toBe(2);

      releaseTask[1]?.();
      await results[1];
      await waitForLimiterQueue();

      expect(started).toEqual([0, 1, 2, 3]);
      expect(activeCount).toBe(2);
      expect(maxActiveCount).toBe(2);

      releaseTask[2]?.();
      releaseTask[3]?.();

      await expect(Promise.all(results)).resolves.toEqual([0, 1, 2, 3]);
    });

    it("throws when concurrency is less than 1", () => {
      expect(() => createConcurrencyLimiter(0)).toThrow(RangeError);
    });
  });
});
