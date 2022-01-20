"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapEvent = void 0;
const gcal_helpers_1 = require("@compass/backend/src/common/services/gcal/gcal.helpers");
const errors_base_1 = require("@core/errors/errors.base");
var MapEvent;
(function (MapEvent) {
    MapEvent.toCompass = (userId, events) => {
        const mapped = events
            .filter(gcal_helpers_1.notCancelled)
            .map((e) => _toCompass(userId, e));
        return mapped;
    };
    MapEvent.toGcal = (userId, event) => {
        console.log("reminder: full-day evts not supported yet [mapper]");
        console.log("reminder: only works in server time (CST) [mapper]");
        const gcalEvent = {
            summary: event.title,
            description: event.description,
            start: {
                dateTime: new Date(event.startDate).toISOString(), // uses server's time, since no TZ info provided
            },
            end: {
                dateTime: new Date(event.endDate).toISOString(),
            },
        };
        return gcalEvent;
    };
})(MapEvent = exports.MapEvent || (exports.MapEvent = {}));
const _toCompass = (userId, gEvent) => {
    // TODO - move to validation service
    if (!gEvent.id) {
        throw new errors_base_1.BaseError("Bad Google Event Id", "You got a google event without an Id, something is off", 500, false);
    }
    //TODO validate that event has either date or dateTime values
    const gEventId = gEvent.id ? gEvent.id : "uh oh";
    const title = gEvent.summary ? gEvent.summary : "untitled";
    const isAllDay = "date" in gEvent.start;
    const compassEvent = {
        gEventId: gEventId,
        user: userId,
        title: title,
        description: gEvent.description,
        priorities: [],
        startDate: isAllDay ? gEvent.start.date : gEvent.start.dateTime,
        endDate: isAllDay ? gEvent.end.date : gEvent.end.dateTime,
        // temp stuff to update
        priority: "self", // $$ TODO update
        // isTimeSelected: true,
        // isOpen: false,
        // order: 0,
        // groupOrder: 0,
        // groupCount: 0,
    };
    return compassEvent;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwLmV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vY29yZS9zcmMvbWFwcGVycy9tYXAuZXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEseUZBQXNGO0FBRXRGLDBEQUFxRDtBQUdyRCxJQUFpQixRQUFRLENBZ0N4QjtBQWhDRCxXQUFpQixRQUFRO0lBQ1Ysa0JBQVMsR0FBRyxDQUN2QixNQUFjLEVBQ2QsTUFBdUIsRUFDUCxFQUFFO1FBQ2xCLE1BQU0sTUFBTSxHQUFHLE1BQU07YUFDbEIsTUFBTSxDQUFDLDJCQUFZLENBQUM7YUFDcEIsR0FBRyxDQUFDLENBQUMsQ0FBZ0IsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMsQ0FBQztJQUVXLGVBQU0sR0FBRyxDQUNwQixNQUFjLEVBQ2QsS0FBbUIsRUFDSixFQUFFO1FBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0RBQW9ELENBQUMsQ0FBQztRQUNsRSxPQUFPLENBQUMsR0FBRyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7UUFFbEUsTUFBTSxTQUFTLEdBQUc7WUFDaEIsT0FBTyxFQUFFLEtBQUssQ0FBQyxLQUFLO1lBQ3BCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztZQUM5QixLQUFLLEVBQUU7Z0JBQ0wsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxnREFBZ0Q7YUFDcEc7WUFDRCxHQUFHLEVBQUU7Z0JBQ0gsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUU7YUFDaEQ7U0FDRixDQUFDO1FBRUYsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxFQWhDZ0IsUUFBUSxHQUFSLGdCQUFRLEtBQVIsZ0JBQVEsUUFnQ3hCO0FBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxNQUFjLEVBQUUsTUFBcUIsRUFBZ0IsRUFBRTtJQUN6RSxvQ0FBb0M7SUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7UUFDZCxNQUFNLElBQUksdUJBQVMsQ0FDakIscUJBQXFCLEVBQ3JCLHdEQUF3RCxFQUN4RCxHQUFHLEVBQ0gsS0FBSyxDQUNOLENBQUM7S0FDSDtJQUNELDZEQUE2RDtJQUU3RCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDakQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0lBRTNELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDO0lBRXhDLE1BQU0sWUFBWSxHQUFpQjtRQUNqQyxRQUFRLEVBQUUsUUFBUTtRQUNsQixJQUFJLEVBQUUsTUFBTTtRQUNaLEtBQUssRUFBRSxLQUFLO1FBQ1osV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1FBQy9CLFVBQVUsRUFBRSxFQUFFO1FBQ2QsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUTtRQUMvRCxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRO1FBRXpELHVCQUF1QjtRQUN2QixRQUFRLEVBQUUsTUFBTSxFQUFFLGlCQUFpQjtRQUNuQyx3QkFBd0I7UUFDeEIsaUJBQWlCO1FBQ2pCLFlBQVk7UUFDWixpQkFBaUI7UUFDakIsaUJBQWlCO0tBQ2xCLENBQUM7SUFFRixPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDLENBQUMifQ==