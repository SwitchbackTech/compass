"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapManyToDTO = exports.getReadAllFilter = void 0;
const getReadAllFilter = (userId, query) => {
    const { start, end, priorities } = query;
    let filter = { user: userId };
    if (priorities) {
        const _priorities = priorities.split(",");
        filter = Object.assign(Object.assign({}, filter), { priorities: { $in: _priorities } });
    }
    if (start && end) {
        const dateFilter = {
            $and: [
                {
                    $or: [
                        {
                            startDate: {
                                $gte: new Date(start).toISOString(),
                            },
                        },
                        {
                            startDate: { $gte: new Date(start).toISOString() },
                        },
                    ],
                },
                {
                    $or: [
                        {
                            endDate: { $lte: new Date(end).toISOString() },
                        },
                        { endDate: { $lte: new Date(end).toISOString() } },
                    ],
                },
            ],
        };
        filter = Object.assign(Object.assign({}, filter), dateFilter);
    }
    return filter;
};
exports.getReadAllFilter = getReadAllFilter;
//TODO abstract for any DTO type
//TODO delete if unneeded
const mapManyToDTO = (data, newIds) => {
    //TODO change to just include a summary of events imported
    const events = [];
    for (const [key, id] of Object.entries(newIds)) {
        const i = parseInt(key);
        events.push(Object.assign(Object.assign({}, data[i]), { _id: id.toString() }));
    }
    return events;
};
exports.mapManyToDTO = mapManyToDTO;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuc2VydmljZS5oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2V2ZW50L3NlcnZpY2VzL2V2ZW50LnNlcnZpY2UuaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHTyxNQUFNLGdCQUFnQixHQUFHLENBQUMsTUFBYyxFQUFFLEtBQWtCLEVBQUUsRUFBRTtJQUNyRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUM7SUFFekMsSUFBSSxNQUFNLEdBQUcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFFOUIsSUFBSSxVQUFVLEVBQUU7UUFDZCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sbUNBQVEsTUFBTSxHQUFLLEVBQUUsVUFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUUsQ0FBQztLQUNqRTtJQUVELElBQUksS0FBSyxJQUFJLEdBQUcsRUFBRTtRQUNoQixNQUFNLFVBQVUsR0FBRztZQUNqQixJQUFJLEVBQUU7Z0JBQ0o7b0JBQ0UsR0FBRyxFQUFFO3dCQUNIOzRCQUNFLFNBQVMsRUFBRTtnQ0FDVCxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxFQUFFOzZCQUNwQzt5QkFDRjt3QkFDRDs0QkFDRSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7eUJBQ25EO3FCQUNGO2lCQUNGO2dCQUNEO29CQUNFLEdBQUcsRUFBRTt3QkFDSDs0QkFDRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7eUJBQy9DO3dCQUNELEVBQUUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUU7cUJBQ25EO2lCQUNGO2FBQ0Y7U0FDRixDQUFDO1FBQ0YsTUFBTSxtQ0FBUSxNQUFNLEdBQUssVUFBVSxDQUFFLENBQUM7S0FDdkM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUM7QUF2Q1csUUFBQSxnQkFBZ0Isb0JBdUMzQjtBQUVGLGdDQUFnQztBQUNoQyx5QkFBeUI7QUFDbEIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFvQixFQUFFLE1BQW1CLEVBQUUsRUFBRTtJQUN4RSwwREFBMEQ7SUFDMUQsTUFBTSxNQUFNLEdBQW1CLEVBQUUsQ0FBQztJQUVsQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUM5QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDLElBQUksaUNBQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLElBQUcsQ0FBQztLQUNqRDtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQztBQVRXLFFBQUEsWUFBWSxnQkFTdkIifQ==