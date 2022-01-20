"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const priority_service_helpers_1 = require("./priority.service.helpers");
test("Priority ids mapped in correct order", () => {
    const insertedIds = {
        [0]: new mongodb_1.ObjectId(),
        [1]: new mongodb_1.ObjectId(),
        [2]: new mongodb_1.ObjectId(),
    };
    const priorityData = [
        { name: "foo", color: "bar" },
        { name: "boz", color: "bim" },
        { name: "mooo", color: "koy" },
    ];
    const priorities = priority_service_helpers_1.mapPriorityData(insertedIds, priorityData, "user123");
    expect(priorities[0]._id).toEqual(insertedIds[0].toString());
    expect(priorities[1]._id).toEqual(insertedIds[1].toString());
    expect(priorities[2]._id).toEqual(insertedIds[2].toString());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHkuc2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3ByaW9yaXR5L3NlcnZpY2VzL3ByaW9yaXR5LnNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFDQUFtQztBQUtuQyx5RUFBNkQ7QUFFN0QsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtJQUNoRCxNQUFNLFdBQVcsR0FBZ0I7UUFDL0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLGtCQUFRLEVBQUU7UUFDbkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLGtCQUFRLEVBQUU7UUFDbkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLGtCQUFRLEVBQUU7S0FDcEIsQ0FBQztJQUNGLE1BQU0sWUFBWSxHQUFrQjtRQUNsQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtRQUM3QixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtRQUM3QixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRTtLQUMvQixDQUFDO0lBRUYsTUFBTSxVQUFVLEdBQXNCLDBDQUFlLENBQ25ELFdBQVcsRUFDWCxZQUFZLEVBQ1osU0FBUyxDQUNWLENBQUM7SUFFRixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUM3RCxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUM3RCxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyJ9