import { Answers_v0 } from "../types/waitlist.types";

export class WaitlistRepository {
  // const exists = await mongoService.user.findOne({ email });
  // if (!exists) {
  //   await mongoService.user.insertOne({
  //     email,
  //     name,
  //     firstName: name,
  //     lastName: "",
  //     locale: "en",
  //     google: {
  //       googleId: "",
  //       picture: "",
  //       gRefreshToken: "",
  //     },
  //     signedUpAt: new Date(),
  //   });
  // }
  async saveWaitlistAnswers(answers: Answers_v0) {
    return true;
  }
}
