export const debounce = <T>(f: (...args: T[]) => void, ms: number) => {
  let isCooldown = false;

  return (...args: T[]) => {
    if (isCooldown) return;

    f(...args);

    isCooldown = true;

    setTimeout(() => {
      isCooldown = false;
    }, ms);
  };
};
