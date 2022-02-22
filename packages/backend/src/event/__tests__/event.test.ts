import { getReadAllFilter } from "@backend/event/services/event.service.helpers";

/* useful for deeply nested objects, like Mongo filters */
const flatten = (obj, out) => {
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] == "object") {
      out = flatten(obj[key], out); //recursively call for nesteds
    } else {
      out[key] = obj[key]; //direct assign for values
    }
  });
  return out;
};
describe("getReadAllFilter", () => {
  it("uses ISO date values", () => {
    const start = "2011-10-20T00:00:00-06:00";
    const end = "2011-11-26T00:00:00-06:00";
    const filter = getReadAllFilter("123user", {
      start,
      end,
    });
    const flatFilter = flatten(filter, {});
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
