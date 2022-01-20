"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIds = void 0;
const mongodb_1 = require("mongodb");
const errors_base_1 = require("@core/errors/errors.base");
const validateIds = (req, res, next) => {
    const idsToCheck = [res.locals.user.id];
    if (req.params.id !== undefined)
        idsToCheck.push(req.params.id);
    idsToCheck.forEach((i) => {
        if (!mongodb_1.ObjectId.isValid(i)) {
            const err = new errors_base_1.BaseError("Bad ID", `${i} is an invalid id (ObjectId or string)`, 400, true);
            next(err);
        }
    });
    next();
};
exports.validateIds = validateIds;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28udmFsaWRhdGlvbi5taWRkbGV3YXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2NvbW1vbi9taWRkbGV3YXJlL21vbmdvLnZhbGlkYXRpb24ubWlkZGxld2FyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxxQ0FBbUM7QUFFbkMsMERBQXFEO0FBRTlDLE1BQU0sV0FBVyxHQUFHLENBQ3pCLEdBQW9CLEVBQ3BCLEdBQXFCLEVBQ3JCLElBQTBCLEVBQzFCLEVBQUU7SUFDRixNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssU0FBUztRQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVoRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBb0IsRUFBRSxFQUFFO1FBQzFDLElBQUksQ0FBQyxrQkFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN4QixNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUFTLENBQ3ZCLFFBQVEsRUFDUixHQUFHLENBQUMsd0NBQXdDLEVBQzVDLEdBQUcsRUFDSCxJQUFJLENBQ0wsQ0FBQztZQUNGLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNYO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLEVBQUUsQ0FBQztBQUNULENBQUMsQ0FBQztBQXJCVyxRQUFBLFdBQVcsZUFxQnRCIn0=