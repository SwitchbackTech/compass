import {
  GithubLogoIcon,
  LinkedinLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { SOCIAL_LINKS } from "@web/common/constants/social.constants";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { useWelcomeModHeld } from "./useWelcomeJumpShortcuts";

const SOCIAL_ICONS = {
  x: XLogoIcon,
  linkedin: LinkedinLogoIcon,
  github: GithubLogoIcon,
} as const;

const SOCIAL_JUMP_DIGITS = ["6", "7", "8"] as const;

const LEGAL_LINKS = [
  {
    digit: "9",
    label: "Privacy",
    href: "https://compasscalendar.com/privacy",
  },
  {
    digit: "0",
    label: "Terms",
    href: "https://compasscalendar.com/terms",
  },
] as const;

export function WelcomeLinks() {
  const isModHeld = useWelcomeModHeld();

  return (
    <div className="flex items-center justify-between border-border border-t pt-4">
      <div className="flex items-center gap-3">
        {SOCIAL_LINKS.map(({ id, label, href }, index) => {
          const SocialIcon = SOCIAL_ICONS[id];
          const digit = SOCIAL_JUMP_DIGITS[index];
          return (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="c-focus-ring inline-flex items-center gap-1 text-text-muted transition-colors hover:text-text"
              data-welcome-jump={String(index)}
            >
              <SocialIcon size={18} weight="bold" />
              {isModHeld && (
                <ShortcutHint className="shrink-0">{digit}</ShortcutHint>
              )}
            </a>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-text-muted text-xs">
        {LEGAL_LINKS.map(({ digit, label, href }, index) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="c-focus-ring inline-flex items-center gap-1 underline-offset-4 hover:text-text hover:underline"
            data-welcome-jump={String(SOCIAL_LINKS.length + index)}
          >
            {label}
            {isModHeld && (
              <ShortcutHint className="shrink-0">{digit}</ShortcutHint>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
