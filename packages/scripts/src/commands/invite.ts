import { _confirm, log } from "@scripts/common/cli.utils";
import mongoService from "@backend/common/services/mongo.service";
import WaitlistService from "@backend/waitlist/service/waitlist.service";

mongoService;

export const inviteWaitlist = async () => {
  await mongoService.waitUntilConnected();

  const waitlisted = await WaitlistService.getAllWaitlisted();
  log.success(`Total on waitlist: ${waitlisted.length}`);

  if (waitlisted.length === 0) {
    log.info("No users on waitlist");
    process.exit(0);
  }

  for (const record of waitlisted) {
    console.log(record);
    const shouldInvite = await _confirm("Invite this user?");
    if (shouldInvite) {
      console.log("Adding to waitlist...");
      await WaitlistService.invite(record.email);
    }
  }
  process.exit(0);
};
