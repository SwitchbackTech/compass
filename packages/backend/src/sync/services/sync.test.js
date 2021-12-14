import { gcalEventsExample } from "./sync.test.data";
import { categorizeGcalEvents } from "./sync.service.helpers";
describe("Categorize GCal Updates", () => {
  test("finds deleted events", () => {
    const cancelledIds = [];
    gcalEventsExample.forEach((e) => {
      if (e.status === "cancelled") {
        cancelledIds.push(e.id);
      }
    });
    const cancelledEvents = gcalEventsExample.filter(
      (e) => e.status === "cancelled"
    );

    const categorized = categorizeGcalEvents("user1", gcalEventsExample);
    console.log(cancelledIds);
    const deletedEventsHasTestId = cancelledIds.includes(
      "0cu25g99pfkhlfarupevcjc297_20211123T170000"
    );
    // categorized.forEach((event)=> {
    //     if (event.s)
    // });

    expect(deletedEventsHasTestId).toBe(true);
  });
});
