type ConcurrencyLimiter = <Result>(
  task: () => PromiseLike<Result> | Result,
) => Promise<Result>;

export const createConcurrencyLimiter = (
  concurrency: number,
): ConcurrencyLimiter => {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("Concurrency must be an integer greater than 0");
  }

  let activeCount = 0;
  const queue: Array<() => void> = [];

  const runNext = () => {
    activeCount -= 1;
    queue.shift()?.();
  };

  return async <Result>(
    task: () => PromiseLike<Result> | Result,
  ): Promise<Result> => {
    if (activeCount >= concurrency) {
      await new Promise<void>((resolve) => {
        queue.push(resolve);
      });
    }

    activeCount += 1;

    try {
      return await task();
    } finally {
      runNext();
    }
  };
};
