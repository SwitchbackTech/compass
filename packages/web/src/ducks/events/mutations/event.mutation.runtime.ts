import {
  hasUserEverAuthenticated,
  markAnonymousCalendarChangeForSignUpPrompt,
} from "@web/auth/compass/state/auth.state.util";
import { isGoogleRevoked } from "@web/auth/google/state/google.auth.state";
import { session } from "@web/common/classes/Session";

export async function markAnonymousEventWrite() {
  if (await session.doesSessionExist()) return;
  if (hasUserEverAuthenticated() || isGoogleRevoked()) return;
  markAnonymousCalendarChangeForSignUpPrompt();
}
