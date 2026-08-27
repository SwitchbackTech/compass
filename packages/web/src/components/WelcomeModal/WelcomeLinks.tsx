import {
  GithubLogoIcon,
  LinkedinLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { type ReactNode } from "react";
import { SOCIAL_LINKS } from "@web/common/constants/social.constants";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";

const SOCIAL_ICONS = {
  x: XLogoIcon,
  linkedin: LinkedinLogoIcon,
  github: GithubLogoIcon,
} as const;

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

function JumpAnchor({
  jumpIndex,
  digit,
  href,
  label,
  isModHeld,
  className,
  children,
}: {
  jumpIndex: number;
  digit: string;
  href: string;
  label?: string;
  isModHeld: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={className}
      data-welcome-jump={String(jumpIndex)}
    >
      {children}
      {isModHeld && <ShortcutHint className="shrink-0">{digit}</ShortcutHint>}
    </a>
  );
}

export function WelcomeLinks({ isModHeld }: { isModHeld: boolean }) {
  return (
    <div className="flex items-center justify-between border-border border-t pt-4">
      <div className="flex items-center gap-3">
        {SOCIAL_LINKS.map(({ id, label, href }, index) => {
          const SocialIcon = SOCIAL_ICONS[id];
          return (
            <JumpAnchor
              key={id}
              jumpIndex={index}
              digit={String(index + 6)}
              href={href}
              label={label}
              isModHeld={isModHeld}
              className="c-focus-ring inline-flex items-center gap-1 text-text-muted transition-colors hover:text-text"
            >
              <SocialIcon size={18} weight="bold" />
            </JumpAnchor>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-text-muted text-xs">
        {LEGAL_LINKS.map(({ digit, label, href }, index) => (
          <JumpAnchor
            key={label}
            jumpIndex={SOCIAL_LINKS.length + index}
            digit={digit}
            href={href}
            isModHeld={isModHeld}
            className="c-focus-ring inline-flex items-center gap-1 underline-offset-4 hover:text-text hover:underline"
          >
            {label}
          </JumpAnchor>
        ))}
      </div>
    </div>
  );
}
