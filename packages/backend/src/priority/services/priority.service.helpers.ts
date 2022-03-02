import { InsertedIds } from "@core/types/mongo.types";
import { Schema_Priority, PriorityReq } from "@core/types/priority.types";

// documents inserted in order by default, so mapping by
// key order is safe
export const mapPriorityData = (
  newIds: InsertedIds,
  data: PriorityReq[],
  userId: string
): Schema_Priority[] => {
  const priorities: Schema_Priority[] = [];
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
