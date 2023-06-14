import mongoService from "@backend/common/services/mongo.service";
import { getIdFilter } from "@backend/common/helpers/mongo.utils";

type Ids_User = "email" | "_id" | "google.googleId";

export const findCompassUserBy = async (key: Ids_User, value: string) => {
  const filter = getIdFilter(key, value);
  const user = await mongoService.user.findOne(filter);

  return user;
};

export const findCompassUsersBy = async (key: Ids_User, value: string) => {
  const filter = getIdFilter(key, value);

  const users = await mongoService.user.find(filter).toArray();

  return users;
};

export const updateGoogleRefreshToken = async (
  id: string,
  gRefreshToken: string
) => {
  const filter = getIdFilter("_id", id);
  const result = await mongoService.user.findOneAndUpdate(filter, {
    $set: { "google.gRefreshToken": gRefreshToken },
  });

  return result;
};
