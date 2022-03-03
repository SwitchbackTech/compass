"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIds = void 0;
const mongodb_1 = require("mongodb");
const errors_base_1 = require("@core/errors/errors.base");
const validateIds = (req, res, next) => {
  const idsToCheck = [res.locals["user"]["id"]];
  //@ts-ignore
  if (req.params.id !== undefined) idsToCheck.push(req.params.id);
  idsToCheck.forEach((i) => {
    if (!mongodb_1.ObjectId.isValid(i)) {
      const err = new errors_base_1.BaseError(
        "Bad ID",
        `${i} is an invalid id (ObjectId or string)`,
        400,
        true
      );
      next(err);
    }
  });
  next();
};
exports.validateIds = validateIds;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28udmFsaWRhdGlvbi5taWRkbGV3YXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvY29tbW9uL21pZGRsZXdhcmUvbW9uZ28udmFsaWRhdGlvbi5taWRkbGV3YXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFDQUFtQztBQUNuQywwREFBcUQ7QUFFOUMsTUFBTSxXQUFXLEdBQUcsQ0FDekIsR0FBb0IsRUFDcEIsR0FBcUIsRUFDckIsSUFBMEIsRUFDMUIsRUFBRTtJQUNGLE1BQU0sVUFBVSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzlDLFlBQVk7SUFDWixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLFNBQVM7UUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFaEUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQW9CLEVBQUUsRUFBRTtRQUMxQyxJQUFJLENBQUMsa0JBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSx1QkFBUyxDQUN2QixRQUFRLEVBQ1IsR0FBRyxDQUFDLHdDQUF3QyxFQUM1QyxHQUFHLEVBQ0gsSUFBSSxDQUNMLENBQUM7WUFDRixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDWDtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxFQUFFLENBQUM7QUFDVCxDQUFDLENBQUM7QUF0QlcsUUFBQSxXQUFXLGVBc0J0QiJ9
