"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notCancelled = exports.isAllDay = void 0;
const isAllDay = (event) => {
  var _a, _b;
  return (
    event !== undefined &&
    // 'YYYY-MM-DD' has 10 chars
    ((_a = event.startDate) === null || _a === void 0 ? void 0 : _a.length) ===
      10 &&
    ((_b = event.endDate) === null || _b === void 0 ? void 0 : _b.length) === 10
  );
};
exports.isAllDay = isAllDay;
const notCancelled = (e) => {
  return e.status && e.status !== "cancelled";
};
exports.notCancelled = notCancelled;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQudXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL3V0aWwvZXZlbnQudXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHTyxNQUFNLFFBQVEsR0FBRyxDQUFDLEtBQW1CLEVBQUUsRUFBRTs7SUFDOUMsT0FBQSxLQUFLLEtBQUssU0FBUztRQUNuQiw0QkFBNEI7UUFDNUIsQ0FBQSxNQUFBLEtBQUssQ0FBQyxTQUFTLDBDQUFFLE1BQU0sTUFBSyxFQUFFO1FBQzlCLENBQUEsTUFBQSxLQUFLLENBQUMsT0FBTywwQ0FBRSxNQUFNLE1BQUssRUFBRSxDQUFBO0NBQUEsQ0FBQztBQUpsQixRQUFBLFFBQVEsWUFJVTtBQUV4QixNQUFNLFlBQVksR0FBRyxDQUFDLENBQWdCLEVBQUUsRUFBRTtJQUMvQyxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxXQUFXLENBQUM7QUFDOUMsQ0FBQyxDQUFDO0FBRlcsUUFBQSxZQUFZLGdCQUV2QiJ9
