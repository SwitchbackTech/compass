import { getReadAllFilter } from "@backend/event/services/event.service.helpers";

/* useful for deeply nested objects, like Mongo filters */
const flatten = (obj: object, out: object) => {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] == "object") {
      out = flatten(obj[key], out); // recursively call for nesteds
    } else {
      out[key] = obj[key]; // direct assign for values
    }
  });
  return out;
};
describe("getReadAllFilter", () => {
  it("uses ISO date values", () => {
    const start = "2011-10-20T00:00:00-10:00";
    const end = "2011-11-26T00:00:00-10:00";
    const filter = getReadAllFilter("123user", {
      start,
      end,
    });
    const flatFilter = flatten(filter, {});
    // finds date by using the greater than and less than operator as a search key
    const startIsIso = flatFilter["$gte"] === new Date(start).toISOString();
    const endIsIso = flatFilter["$lte"] === new Date(end).toISOString();
    expect(startIsIso).toBe(true);
    expect(endIsIso).toBe(true);
  });
  it("includes user", () => {
    const filter = getReadAllFilter("userX", {
      start: "2022-02-20T00:00:00-06:00",
      end: "2022-02-26T00:00:00-06:00",
    });
    expect("user" in filter).toBe(true);
  });
});
/* finish once enabling 3+week filer 
  it("finds events that span 3+ weeks", () => {
    const start = "2022-02-02";
    const end = "2022-02-23";

    const startOfWeek = "2022-02-13";
    const endOfWeek = "2022-02-19";
    PROBLEM: start or end NOT in between startOfWeek, endOfWeek
      SOLUTION 2: range + day of year
        02-02, 02-23
        dayOfYear: 33-54
        datesOfWeek: 13-19
        datesOfWeekYearDate: 43-52

        start (33) && end (54) $not between 43,52
        AND
        any(34,35,....52,53) $in between (43,44,...51,52)

        _steps_
          - convert dates to days of year
          - create array of days of year based on start + end date
          - check if start + end not in between range
          - check if any days array in week day array

        SOLUTION: array of dates by month label
          02-02, 02-23
          datesOfWeek = 13,14,15,16,17,18,19
          datesOfEvent = 02,03,04,05,06,07,08,09
                        10,11,12,13,14,15,16,17,
                        18,19,20,21,22,23

          02-25, 03-30
          daysOfWEek = 0227,0228, 0301, 0302, 3, 4, 5
          datesOfEvent = 01,02,03,04,05,06,07,08,09
                        10,11,12,13,14,15,16,17,
                        18,19,20,21,22,23,24,25
                        26,27,28,29,30,31

        // if any(datesOfEvent $in datesOfWeek), return
        // ? hows work for month change?
    */
