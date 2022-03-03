"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daysFromNowTimestamp = exports.minutesFromNow = void 0;
const minutesFromNow = (numMin, format) => {
  if (format === "ms") {
    const MS_IN_MIN = 60000;
    const msToAdd = numMin * MS_IN_MIN;
    const minFromNow = Date.now() + msToAdd;
    return minFromNow;
  } else {
    return -666;
  }
};
exports.minutesFromNow = minutesFromNow;
const daysFromNowTimestamp = (numDays, format) => {
  if (format === "ms") {
    const MS_IN_DAY = 86400000;
    const msToAdd = numDays * MS_IN_DAY;
    const daysFromNow = Date.now() + msToAdd;
    return daysFromNow;
  } else {
    return -666;
  }
};
exports.daysFromNowTimestamp = daysFromNowTimestamp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZS51dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL3V0aWwvZGF0ZS51dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBTyxNQUFNLGNBQWMsR0FBRyxDQUFDLE1BQWMsRUFBRSxNQUFjLEVBQUUsRUFBRTtJQUMvRCxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7UUFDbkIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUN4QyxPQUFPLFVBQVUsQ0FBQztLQUNuQjtTQUFNO1FBQ0wsT0FBTyxDQUFDLEdBQUcsQ0FBQztLQUNiO0FBQ0gsQ0FBQyxDQUFDO0FBVFcsUUFBQSxjQUFjLGtCQVN6QjtBQUVLLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxPQUFlLEVBQUUsTUFBYyxFQUFFLEVBQUU7SUFDdEUsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO1FBQ25CLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUMzQixNQUFNLE9BQU8sR0FBRyxPQUFPLEdBQUcsU0FBUyxDQUFDO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFDekMsT0FBTyxXQUFXLENBQUM7S0FDcEI7U0FBTTtRQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUM7S0FDYjtBQUNILENBQUMsQ0FBQztBQVRXLFFBQUEsb0JBQW9CLHdCQVMvQiJ9
