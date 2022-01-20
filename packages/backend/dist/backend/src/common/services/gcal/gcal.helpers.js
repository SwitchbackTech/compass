"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notCancelled = exports.cancelledEventsIds = exports.cancelled = void 0;
const cancelled = (e) => {
    return e.status && e.status === "cancelled";
};
exports.cancelled = cancelled;
const cancelledEventsIds = (events) => {
    const cancelledIds = [];
    events.filter(exports.cancelled).forEach((e) => {
        cancelledIds.push(e.id);
    });
    return cancelledIds;
};
exports.cancelledEventsIds = cancelledEventsIds;
const notCancelled = (e) => {
    return e.status && e.status !== "cancelled";
};
exports.notCancelled = notCancelled;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2NhbC5oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvbW1vbi9zZXJ2aWNlcy9nY2FsL2djYWwuaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFTyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQWdCLEVBQUUsRUFBRTtJQUM1QyxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxXQUFXLENBQUM7QUFDOUMsQ0FBQyxDQUFDO0FBRlcsUUFBQSxTQUFTLGFBRXBCO0FBRUssTUFBTSxrQkFBa0IsR0FBRyxDQUFDLE1BQXVCLEVBQUUsRUFBRTtJQUM1RCxNQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7SUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBZ0IsRUFBRSxFQUFFO1FBQ3BELFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQyxDQUFDO0FBTlcsUUFBQSxrQkFBa0Isc0JBTTdCO0FBRUssTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFnQixFQUFFLEVBQUU7SUFDL0MsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssV0FBVyxDQUFDO0FBQzlDLENBQUMsQ0FBQztBQUZXLFFBQUEsWUFBWSxnQkFFdkIifQ==