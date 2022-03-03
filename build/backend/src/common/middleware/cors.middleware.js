"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cors_1 = (0, tslib_1.__importDefault)(require("cors"));
const allowedOrigins = process.env["CORS"]
  ? process.env["CORS"].split(",")
  : [];
const corsWhitelist = (0, cors_1.default)({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
});
exports.default = corsWhitelist;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ycy5taWRkbGV3YXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvY29tbW9uL21pZGRsZXdhcmUvY29ycy5taWRkbGV3YXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZEQUF3QjtBQUN4QixNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUN4QyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ2hDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFUCxNQUFNLGFBQWEsR0FBRyxJQUFBLGNBQUksRUFBQztJQUN6QixNQUFNLEVBQUUsVUFBVSxNQUFNLEVBQUUsUUFBUTtRQUNoQyxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU8sUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV6QyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDekMsTUFBTSxHQUFHLEdBQUcsNERBQTRELE1BQU0sRUFBRSxDQUFDO1lBQ2pGLE9BQU8sUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3hDO1FBQ0QsT0FBTyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7Q0FDRixDQUFDLENBQUM7QUFFSCxrQkFBZSxhQUFhLENBQUMifQ==
