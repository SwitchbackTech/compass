"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daysFromNowTimestamp = exports.minutesFromNow = void 0;
const minutesFromNow = (numMin, format) => {
    if (format === "ms") {
        const MS_IN_MIN = 60000;
        const msToAdd = numMin * MS_IN_MIN;
        const minFromNow = Date.now() + msToAdd;
        return minFromNow;
    }
};
exports.minutesFromNow = minutesFromNow;
const daysFromNowTimestamp = (numDays, format) => {
    if (format === "ms") {
        const MS_IN_DAY = 86400000;
        const msToAdd = numDays * MS_IN_DAY;
        const daysFromNow = Date.now() + msToAdd;
        return daysFromNow;
    }
};
exports.daysFromNowTimestamp = daysFromNowTimestamp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZS51dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2NvcmUvc3JjL3V0aWwvZGF0ZS51dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBTyxNQUFNLGNBQWMsR0FBRyxDQUFDLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTtJQUM3RCxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7UUFDakIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFBO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxTQUFTLENBQUE7UUFDbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQTtRQUN2QyxPQUFPLFVBQVUsQ0FBQTtLQUNwQjtBQUNMLENBQUMsQ0FBQTtBQVBZLFFBQUEsY0FBYyxrQkFPMUI7QUFFTSxNQUFNLG9CQUFvQixHQUFFLENBQUMsT0FBZSxFQUFFLE1BQWMsRUFBRSxFQUFFO0lBQ25FLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtRQUNqQixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUE7UUFDMUIsTUFBTSxPQUFPLEdBQUcsT0FBTyxHQUFHLFNBQVMsQ0FBQTtRQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsT0FBTyxDQUFBO1FBQ3hDLE9BQU8sV0FBVyxDQUFBO0tBQ3JCO0FBQ0wsQ0FBQyxDQUFBO0FBUFksUUFBQSxvQkFBb0Isd0JBT2hDIn0=