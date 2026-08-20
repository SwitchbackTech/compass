import { mapWithConcurrency } from "@sync/util/map-with-concurrency";

describe("mapWithConcurrency", () => {
  it("caps work for a maximum-size foreground batch", async () => {
    let active = 0;
    let peak = 0;
    const releases: Array<() => void> = [];
    const mapped = mapWithConcurrency(
      Array.from({ length: 500 }, (_, index) => index),
      10,
      async (value) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise<void>((resolve) => releases.push(resolve));
        active -= 1;
        return value * 2;
      },
    );

    await Bun.sleep(0);
    expect(active).toBe(10);
    while (releases.length > 0 || active > 0) {
      releases.splice(0).forEach((release) => release());
      await Bun.sleep(0);
    }

    const results = await mapped;
    expect(peak).toBe(10);
    expect(results).toHaveLength(500);
    expect(results[499]).toBe(998);
  });
});
