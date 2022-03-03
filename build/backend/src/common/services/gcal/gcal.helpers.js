"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelledEventsIds = void 0;
const cancelled = (e) => {
  /*
    'cancelled' is the same as deleted according to Gcal API
        - however, there's an exception for 'uncancelled recurring events',
          so this'll need to be updated once Compass supports recurring events
        - see 'status' section of: https://developers.google.com/calendar/api/v3/reference/events#resource
    */
  return e.status && e.status === "cancelled";
};
const cancelledEventsIds = (events) => {
  const cancelledIds = [];
  events.filter(cancelled).forEach((e) => {
    //@ts-ignore
    cancelledIds.push(e.id);
  });
  return cancelledIds;
};
exports.cancelledEventsIds = cancelledEventsIds;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2NhbC5oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvY29tbW9uL3NlcnZpY2VzL2djYWwvZ2NhbC5oZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBZ0IsRUFBRSxFQUFFO0lBQ3JDOzs7OztNQUtFO0lBQ0YsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssV0FBVyxDQUFDO0FBQzlDLENBQUMsQ0FBQztBQUVLLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxNQUF1QixFQUFFLEVBQUU7SUFDNUQsTUFBTSxZQUFZLEdBQWEsRUFBRSxDQUFDO0lBQ2xDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBZ0IsRUFBRSxFQUFFO1FBQ3BELFlBQVk7UUFDWixZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUMsQ0FBQztBQVBXLFFBQUEsa0JBQWtCLHNCQU83QiJ9
