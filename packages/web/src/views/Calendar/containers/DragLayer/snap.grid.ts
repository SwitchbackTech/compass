export const snapToGrid = (x: number, y: number): [number, number] => {
  const yInterval = 10; // hacky way to get snap feel; not accurate
  const snappedY = Math.round(y / yInterval) * yInterval;
  const snappedX = x;

  return [snappedX, snappedY];
};
