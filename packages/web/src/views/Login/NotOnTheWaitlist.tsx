import { WAITLIST_URL } from "@web/common/constants/web.constants";
import { InfoText, TertiaryButton } from "./styled";

export const NotOnTheWaitlist = () => {
  return (
    <>
      <InfoText>
        You are not on the waitlist yet. Sign up to get notified when a spot
        opens up!
      </InfoText>
      <TertiaryButton href={WAITLIST_URL} target="_blank" rel="noreferrer">
        Sign Up for Waitlist
      </TertiaryButton>
    </>
  );
};
