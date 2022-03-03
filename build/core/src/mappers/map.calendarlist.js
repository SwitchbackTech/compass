"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapCalendarList = void 0;
const MapCalendarList = {
  toCompass(gcalList) {
    var _a;
    const primaryGcal =
      (_a = gcalList.items) === null || _a === void 0
        ? void 0
        : _a.filter((c) => {
            return c.primary === true;
          })[0];
    const mapped = {
      google: {
        nextSyncToken: gcalList.nextSyncToken || "error",
        items: [primaryGcal],
      },
    };
    // @ts-ignore
    return mapped;
  },
};
exports.MapCalendarList = MapCalendarList;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwLmNhbGVuZGFybGlzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvcmUvc3JjL21hcHBlcnMvbWFwLmNhbGVuZGFybGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSxNQUFNLGVBQWUsR0FBRztJQUN0QixTQUFTLENBQUMsUUFBOEI7O1FBQ3RDLE1BQU0sV0FBVyxHQUFHLE1BQUEsUUFBUSxDQUFDLEtBQUssMENBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDL0MsT0FBTyxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQztRQUM1QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFTixNQUFNLE1BQU0sR0FBRztZQUNiLE1BQU0sRUFBRTtnQkFDTixhQUFhLEVBQUUsUUFBUSxDQUFDLGFBQWEsSUFBSSxPQUFPO2dCQUNoRCxLQUFLLEVBQUUsQ0FBQyxXQUFXLENBQUM7YUFDckI7U0FDRixDQUFDO1FBRUYsYUFBYTtRQUNiLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRixDQUFDO0FBRU8sMENBQWUifQ==
