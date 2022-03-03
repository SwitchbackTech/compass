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
      //@ts-ignore
      name: data[i].name,
      //@ts-ignore
      color: data[i].color,
    });
  }
  return priorities;
};
exports.mapPriorityData = mapPriorityData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHkuc2VydmljZS5oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvcHJpb3JpdHkvc2VydmljZXMvcHJpb3JpdHkuc2VydmljZS5oZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBLHdEQUF3RDtBQUN4RCxvQkFBb0I7QUFDYixNQUFNLGVBQWUsR0FBRyxDQUM3QixNQUFtQixFQUNuQixJQUFtQixFQUNuQixNQUFjLEVBQ0ssRUFBRTtJQUNyQixNQUFNLFVBQVUsR0FBc0IsRUFBRSxDQUFDO0lBQ3pDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzlDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QixVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ2QsR0FBRyxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUU7WUFDbEIsSUFBSSxFQUFFLE1BQU07WUFDWixZQUFZO1lBQ1osSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQ2xCLFlBQVk7WUFDWixLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7U0FDckIsQ0FBQyxDQUFDO0tBQ0o7SUFDRCxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDLENBQUM7QUFsQlcsUUFBQSxlQUFlLG1CQWtCMUIifQ==
