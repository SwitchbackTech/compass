/**
 * Sets up time synchronization to update at minute boundaries
 * @param callback Function to call when time updates
 * @returns Cleanup function to stop the synchronization
 */
export const setupMinuteSync = (callback: () => void): (() => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let intervalId: NodeJS.Timeout | null = null;

  const startSync = () => {
    const now = new Date();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();

    // Calculate milliseconds until next minute boundary
    const msUntilNextMinute = 60000 - (seconds * 1000 + milliseconds);

    // Set timeout to sync to the next minute boundary
    timeoutId = setTimeout(() => {
      callback(); // Call immediately when minute boundary is reached

      // Then set up interval to call every minute thereafter
      intervalId = setInterval(callback, 60000);
    }, msUntilNextMinute);
  };

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  startSync();
  return cleanup;
};
