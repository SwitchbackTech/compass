"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPriorityData = void 0;
// documents inserted in order by default, so mapping by
// key order is safe
const mapPriorityData = (newIds, data, userId) => {
    const priorities = [];
    for (const [key, id] of Object.entries(newIds)) {
        const i = parseInt(key);
        priorities.push({
            _id: id.toString(),
            user: userId,
            name: data[i].name,
            color: data[i].color,
        });
    }
    return priorities;
};
exports.mapPriorityData = mapPriorityData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHkuc2VydmljZS5oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3ByaW9yaXR5L3NlcnZpY2VzL3ByaW9yaXR5LnNlcnZpY2UuaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSx3REFBd0Q7QUFDeEQsb0JBQW9CO0FBQ2IsTUFBTSxlQUFlLEdBQUcsQ0FDN0IsTUFBbUIsRUFDbkIsSUFBbUIsRUFDbkIsTUFBYyxFQUNLLEVBQUU7SUFDckIsTUFBTSxVQUFVLEdBQXNCLEVBQUUsQ0FBQztJQUN6QyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUM5QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEIsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNkLEdBQUcsRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQ2xCLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQ2xCLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztTQUNyQixDQUFDLENBQUM7S0FDSjtJQUNELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQWhCVyxRQUFBLGVBQWUsbUJBZ0IxQiJ9