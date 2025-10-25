import {
  InfoText,
  NavLinkContainer,
  NavLinkIcon,
  NavLinkText,
  StyledNavLink,
} from "./styled";

export const OnTheWaitlist = () => {
  return (
    <>
      <InfoText>
        You're on the waitlist! We're carefully reviewing applicants and will
        notify you once you're invited. In the meantime, you can engage with us
        in these ways:
      </InfoText>
      <NavLinkContainer>
        <StyledNavLink
          href="https://github.com/SwitchbackTech/compass"
          target="_blank"
          rel="noreferrer"
        >
          <NavLinkIcon>👨‍💻</NavLinkIcon>
          <NavLinkText>View the code (we're open source!)</NavLinkText>
        </StyledNavLink>
        <StyledNavLink
          href="https://youtube.com/playlist?list=PLPQAVocXPdjmYaPM9MXzplcwgoXZ_yPiJ&si=ypf5Jg8tZt6Tez36"
          target="_blank"
          rel="noreferrer"
        >
          <NavLinkIcon>📺</NavLinkIcon>
          <NavLinkText>Watch Compass on YouTube</NavLinkText>
        </StyledNavLink>
      </NavLinkContainer>
    </>
  );
};
