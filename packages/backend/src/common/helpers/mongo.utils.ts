import { ObjectId } from "mongodb";

export const getIdFilter = (key: string, value: string) => {
  if (key === "_id") {
    return { _id: new ObjectId(value) };
  }
  return { [key]: value };
};
