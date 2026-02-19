import { ObjectId } from "bson";

export const createObjectIdString = (): string => new ObjectId().toString();
