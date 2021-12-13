import { daysFromNowTimestamp } from "./date.utils";

describe("xDaysFromNow Tests", () => {
    test("returns correct format and value", () => {
        const now = Date.now()
        const twoDaysFromNow = daysFromNowTimestamp(2, "ms")
        expect(twoDaysFromNow).toBeGreaterThan(now)

        const d = new Date(twoDaysFromNow);
        const twoDaysAndOneMin = d.setMinutes(d.getMinutes() + 1);

        expect(twoDaysFromNow).toBeGreaterThan(now)
        expect(twoDaysFromNow).toBeLessThan(twoDaysAndOneMin)
    })
})