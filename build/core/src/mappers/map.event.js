"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapEvent = void 0;
/* eslint-disable @typescript-eslint/no-namespace */
const errors_base_1 = require("@core/errors/errors.base");
const core_constants_1 = require("@core/core.constants");
const event_util_1 = require("@core/util/event.util");
var MapEvent;
(function (MapEvent) {
  MapEvent.toCompass = (userId, events, origin) => {
    const mapped = events
      .filter(event_util_1.notCancelled)
      .map((e) => _toCompass(userId, e, origin));
    return mapped;
  };
  MapEvent.toGcal = (event) => {
    const dateKey = (0, event_util_1.isAllDay)(event) ? "date" : "dateTime";
    const gcalEvent = {
      summary: event.title,
      description: event.description,
      start: { [dateKey]: event.startDate },
      end: { [dateKey]: event.endDate },
      extendedProperties: {
        private: {
          // capture where event came from to later decide how to
          // sync changes between compass and integrations
          origin: event.origin || "undefined",
        },
      },
    };
    return gcalEvent;
  };
})((MapEvent = exports.MapEvent || (exports.MapEvent = {})));
const _toCompass = (userId, gEvent, origin) => {
  if (!gEvent.id) {
    throw new errors_base_1.BaseError(
      "Bad Google Event Id",
      "You got a google event without an Id, something is off",
      500,
      false
    );
  }
  //TODO validate that event has either date or dateTime values
  const gEventId = gEvent.id ? gEvent.id : "uh oh";
  const title = gEvent.summary ? gEvent.summary : "untitled";
  const description = gEvent.description ? gEvent.description : "";
  const placeHolder = {
    start: {
      date: "1990-01-01",
      dateTime: "1990-01-01T00:00:00-10:00",
    },
    end: {
      date: "1990-01-01",
      dateTime: "1990-01-01T00:00:00-10:00",
    },
  };
  const _start = gEvent.start == undefined ? placeHolder.start : gEvent.start;
  const _end = gEvent.end === undefined ? placeHolder.end : gEvent.end;
  const _isAllDay = gEvent.start !== undefined && "date" in gEvent.start;
  const compassEvent = {
    gEventId: gEventId,
    user: userId,
    origin: origin,
    title: title,
    description: description,
    priorities: [],
    isAllDay: _isAllDay,
    // @ts-ignore
    startDate: _isAllDay ? _start.date : _start.dateTime,
    // @ts-ignore
    endDate: _isAllDay ? _end.date : _end.dateTime,
    // temp stuff to update
    // priority: Priorities.UNASSIGNED,
    priority: core_constants_1.Priorities.WORK,
    // isTimeSelected: true,
    // isOpen: false,
    // order: 0,
    // groupOrder: 0,
    // groupCount: 0,
  };
  return compassEvent;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwLmV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvbWFwcGVycy9tYXAuZXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQW9EO0FBQ3BELDBEQUFxRDtBQUNyRCx5REFBMEQ7QUFDMUQsc0RBQStEO0FBSS9ELElBQWlCLFFBQVEsQ0FnQ3hCO0FBaENELFdBQWlCLFFBQVE7SUFDVixrQkFBUyxHQUFHLENBQ3ZCLE1BQWMsRUFDZCxNQUF1QixFQUN2QixNQUFjLEVBQ0UsRUFBRTtRQUNsQixNQUFNLE1BQU0sR0FBRyxNQUFNO2FBQ2xCLE1BQU0sQ0FBQyx5QkFBWSxDQUFDO2FBQ3BCLEdBQUcsQ0FBQyxDQUFDLENBQWdCLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFNUQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyxDQUFDO0lBRVcsZUFBTSxHQUFHLENBQUMsS0FBbUIsRUFBaUIsRUFBRTtRQUMzRCxNQUFNLE9BQU8sR0FBRyxJQUFBLHFCQUFRLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1FBRXRELE1BQU0sU0FBUyxHQUFrQjtZQUMvQixPQUFPLEVBQUUsS0FBSyxDQUFDLEtBQUs7WUFDcEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO1lBQzlCLEtBQUssRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRTtZQUNyQyxHQUFHLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDakMsa0JBQWtCLEVBQUU7Z0JBQ2xCLE9BQU8sRUFBRTtvQkFDUCx1REFBdUQ7b0JBQ3ZELGdEQUFnRDtvQkFDaEQsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLElBQUksV0FBVztpQkFDcEM7YUFDRjtTQUNGLENBQUM7UUFFRixPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDLENBQUM7QUFDSixDQUFDLEVBaENnQixRQUFRLEdBQVIsZ0JBQVEsS0FBUixnQkFBUSxRQWdDeEI7QUFFRCxNQUFNLFVBQVUsR0FBRyxDQUNqQixNQUFjLEVBQ2QsTUFBcUIsRUFDckIsTUFBYyxFQUNBLEVBQUU7SUFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7UUFDZCxNQUFNLElBQUksdUJBQVMsQ0FDakIscUJBQXFCLEVBQ3JCLHdEQUF3RCxFQUN4RCxHQUFHLEVBQ0gsS0FBSyxDQUNOLENBQUM7S0FDSDtJQUNELDZEQUE2RDtJQUU3RCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDakQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0lBQzNELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUVqRSxNQUFNLFdBQVcsR0FBRztRQUNsQixLQUFLLEVBQUU7WUFDTCxJQUFJLEVBQUUsWUFBWTtZQUNsQixRQUFRLEVBQUUsMkJBQTJCO1NBQ3RDO1FBQ0QsR0FBRyxFQUFFO1lBQ0gsSUFBSSxFQUFFLFlBQVk7WUFDbEIsUUFBUSxFQUFFLDJCQUEyQjtTQUN0QztLQUNGLENBQUM7SUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUM1RSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNyRSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQztJQUV2RSxNQUFNLFlBQVksR0FBaUI7UUFDakMsUUFBUSxFQUFFLFFBQVE7UUFDbEIsSUFBSSxFQUFFLE1BQU07UUFDWixNQUFNLEVBQUUsTUFBTTtRQUNkLEtBQUssRUFBRSxLQUFLO1FBQ1osV0FBVyxFQUFFLFdBQVc7UUFDeEIsVUFBVSxFQUFFLEVBQUU7UUFDZCxRQUFRLEVBQUUsU0FBUztRQUNuQixhQUFhO1FBQ2IsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVE7UUFDcEQsYUFBYTtRQUNiLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRO1FBRTlDLHVCQUF1QjtRQUN2QixtQ0FBbUM7UUFDbkMsUUFBUSxFQUFFLDJCQUFVLENBQUMsSUFBSTtRQUN6Qix3QkFBd0I7UUFDeEIsaUJBQWlCO1FBQ2pCLFlBQVk7UUFDWixpQkFBaUI7UUFDakIsaUJBQWlCO0tBQ2xCLENBQUM7SUFFRixPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDLENBQUMifQ==
