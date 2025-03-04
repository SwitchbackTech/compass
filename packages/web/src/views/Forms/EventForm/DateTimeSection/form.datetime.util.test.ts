import { adjustEndDate } from "./form.datetime.util";

describe("adjustEndDate", () => {
  it("should return the correct end date variations", () => {
    const end = new Date("2025-12-25");
    const { datePickerDate, formattedEndDate } = adjustEndDate(end);

    expect(formattedEndDate).toEqual("2025-12-25");
    expect(datePickerDate).toEqual(new Date("2025-12-26"));
  });
});
