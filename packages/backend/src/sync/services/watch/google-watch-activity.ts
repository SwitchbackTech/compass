import { findCompassUserBy } from "@backend/user/queries/user.queries";

/**
 * Whether `userId` has been active since `deadline`: either their client
 * connected to the SSE stream (`lastSeenAt`, touched on every (re)connect)
 * or they signed in (`lastLoggedInAt`). Missing both (a never-reconnected
 * or pre-lastSeenAt account) counts as inactive, same as a user that no
 * longer exists.
 *
 * A40: replaces a prior check that queried EventRecord's `user`/`origin`
 * fields, which post-cutover EventRecords never have -- it always returned
 * false, so scheduled maintenance classified every user inactive and pruned
 * all their watches each run.
 */
export const hasUserBeenActiveSince = async (
  userId: string,
  deadline: string,
): Promise<boolean> => {
  const user = await findCompassUserBy("_id", userId);

  if (!user) return false;

  const deadlineMs = new Date(deadline).getTime();
  const isAfterDeadline = (at?: Date): boolean =>
    at !== undefined && at.getTime() > deadlineMs;

  return (
    isAfterDeadline(user.lastSeenAt) || isAfterDeadline(user.lastLoggedInAt)
  );
};
