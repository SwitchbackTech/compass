import { CaretDownIcon } from "@phosphor-icons/react";
import classNames from "classnames";
import { type FC } from "react";
import {
  accountCalendarListId,
  toggleAccountCollapsed,
} from "@web/calendars/collapsed-accounts.store";

interface AccountDisclosureHeadingProps {
  /** Heading level - h2 for the single-account header, h3 for a multi-account
   * section (which sits under the calendar list's own h2). */
  as: "h2" | "h3";
  /** Extra classes for font size etc.; layout/spacing stays with the caller. */
  className?: string;
  /** localStorage key this heading's collapse state is stored under - the
   * account's own email, or the single-account sentinel. */
  collapseKey: string;
  email: string;
  isCollapsed: boolean;
  isSyncing: boolean;
  caretSize?: number;
}

/**
 * An account's email, rendered as both its own heading and the collapse
 * toggle for its calendar rows - shared by the sidebar's single-account
 * header and each multi-account section heading so the two surfaces'
 * disclosure a11y wiring (aria-expanded/aria-controls, the caret) cannot
 * drift apart.
 */
export const AccountDisclosureHeading: FC<AccountDisclosureHeadingProps> = ({
  as: Heading,
  className,
  collapseKey,
  email,
  isCollapsed,
  isSyncing,
  caretSize = 12,
}) => (
  <Heading
    className={classNames(
      "min-w-0 flex-1 font-semibold leading-none",
      className,
    )}
  >
    <button
      aria-controls={accountCalendarListId(collapseKey)}
      aria-expanded={!isCollapsed}
      className="c-focus-ring group flex w-full min-w-0 items-center gap-1 rounded-xs text-left"
      onClick={() => toggleAccountCollapsed(collapseKey)}
      type="button"
    >
      <CaretDownIcon
        aria-hidden="true"
        className={classNames(
          "shrink-0 transition-transform",
          isCollapsed && "-rotate-90",
        )}
        size={caretSize}
      />
      <span
        className={classNames(
          "min-w-0 truncate",
          isSyncing
            ? "c-sync-text-wave"
            : "text-text-muted group-hover:text-text",
        )}
        translate="no"
      >
        {email}
      </span>
    </button>
  </Heading>
);
