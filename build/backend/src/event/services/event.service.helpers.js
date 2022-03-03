"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReadAllFilter = void 0;
const getReadAllFilter = (userId, query) => {
  const { start, end, priorities } = query;
  let filter = { user: userId };
  if (priorities) {
    const _priorities = priorities.split(",");
    filter = Object.assign(Object.assign({}, filter), {
      priorities: { $in: _priorities },
    });
  }
  if (start && end) {
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    // include inbetween events:
    //  start OR end date are between the date range in query
    const inBetweenOrOverlappingEvents = {
      $or: [
        {
          $and: [
            {
              startDate: {
                $gte: startIso,
              },
            },
            {
              startDate: {
                $lte: endIso,
              },
            },
          ],
        },
        {
          $and: [
            {
              endDate: {
                $gte: startIso,
              },
            },
            {
              endDate: {
                $lte: endIso,
              },
            },
          ],
        },
        // include overlaps:
        //   starts before AND ends after dates
        {
          startDate: {
            $lte: startIso,
          },
          endDate: {
            $gte: endIso,
          },
        },
      ],
    };
    filter = Object.assign(
      Object.assign({}, filter),
      inBetweenOrOverlappingEvents
    );
  }
  return filter;
};
exports.getReadAllFilter = getReadAllFilter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuc2VydmljZS5oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvZXZlbnQvc2VydmljZXMvZXZlbnQuc2VydmljZS5oZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUlPLE1BQU0sZ0JBQWdCLEdBQUcsQ0FDOUIsTUFBYyxFQUNkLEtBQWtCLEVBQ0YsRUFBRTtJQUNsQixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUM7SUFFekMsSUFBSSxNQUFNLEdBQUcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFFOUIsSUFBSSxVQUFVLEVBQUU7UUFDZCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sbUNBQVEsTUFBTSxHQUFLLEVBQUUsVUFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUUsQ0FBQztLQUNqRTtJQUVELElBQUksS0FBSyxJQUFJLEdBQUcsRUFBRTtRQUNoQixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMvQyxNQUFNLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQyw0QkFBNEI7UUFDNUIseURBQXlEO1FBQ3pELE1BQU0sNEJBQTRCLEdBQUc7WUFDbkMsR0FBRyxFQUFFO2dCQUNIO29CQUNFLElBQUksRUFBRTt3QkFDSjs0QkFDRSxTQUFTLEVBQUU7Z0NBQ1QsSUFBSSxFQUFFLFFBQVE7NkJBQ2Y7eUJBQ0Y7d0JBQ0Q7NEJBQ0UsU0FBUyxFQUFFO2dDQUNULElBQUksRUFBRSxNQUFNOzZCQUNiO3lCQUNGO3FCQUNGO2lCQUNGO2dCQUNEO29CQUNFLElBQUksRUFBRTt3QkFDSjs0QkFDRSxPQUFPLEVBQUU7Z0NBQ1AsSUFBSSxFQUFFLFFBQVE7NkJBQ2Y7eUJBQ0Y7d0JBQ0Q7NEJBQ0UsT0FBTyxFQUFFO2dDQUNQLElBQUksRUFBRSxNQUFNOzZCQUNiO3lCQUNGO3FCQUNGO2lCQUNGO2dCQUNELG9CQUFvQjtnQkFDcEIsdUNBQXVDO2dCQUN2QztvQkFDRSxTQUFTLEVBQUU7d0JBQ1QsSUFBSSxFQUFFLFFBQVE7cUJBQ2Y7b0JBQ0QsT0FBTyxFQUFFO3dCQUNQLElBQUksRUFBRSxNQUFNO3FCQUNiO2lCQUNGO2FBQ0Y7U0FDRixDQUFDO1FBRUYsTUFBTSxtQ0FBUSxNQUFNLEdBQUssNEJBQTRCLENBQUUsQ0FBQztLQUN6RDtJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQztBQWpFVyxRQUFBLGdCQUFnQixvQkFpRTNCIn0=
