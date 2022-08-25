const daysFromNowTimestamp = (numDays: number, format: string) => {
  if (format === "ms") {
    const MS_IN_DAY = 86400000;
    const msToAdd = numDays * MS_IN_DAY;
    const daysFromNow = Date.now() + msToAdd;
    return daysFromNow;
  } else {
    return -666;
  }
};

describe("xDaysFromNow Tests", () => {
  test("returns correct format and value", () => {
    const now = Date.now();
    const twoDaysFromNow = daysFromNowTimestamp(2, "ms");
    expect(twoDaysFromNow).toBeGreaterThan(now);

    const d = new Date(twoDaysFromNow);
    const twoDaysAndOneMin = d.setMinutes(d.getMinutes() + 1);

    expect(twoDaysFromNow).toBeGreaterThan(now);
    expect(twoDaysFromNow).toBeLessThan(twoDaysAndOneMin);
  });
});
