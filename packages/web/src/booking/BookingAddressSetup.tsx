import { BookingAddressField } from "@web/booking/BookingAddressField";
import {
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import { settingsShortcutAttrs } from "@web/settings/useSettingsShortcuts";

const SETUP_HEADING = "Your meeting page";
const SETUP_SENTENCE =
  "Pick the address people will use to book time with you. You can change it later.";

interface BookingAddressSetupProps {
  slug: string;
  bookingUrl: string | null;
  error: string | null;
  forceInvalid?: boolean;
  isPending: boolean;
  onChange: (slug: string) => void;
  onContinue: () => void;
}

/**
 * First-run Meeting settings: pick an address, then Continue saves a draft.
 */
export function BookingAddressSetup({
  slug,
  bookingUrl,
  error,
  forceInvalid = false,
  isPending,
  onChange,
  onContinue,
}: BookingAddressSetupProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="font-medium text-lg text-text">{SETUP_HEADING}</h2>
        <p className="text-sm text-text">{SETUP_SENTENCE}</p>
      </div>
      <BookingAddressField
        bookingUrl={bookingUrl}
        forceInvalid={forceInvalid}
        onChange={onChange}
        savedSlug={null}
        showShortcuts={false}
        slug={slug}
      />
      {error ? (
        <p className="font-medium text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}
      <OverlayPanelActions>
        <OverlayPanelActionButton
          aria-busy={isPending || undefined}
          aria-keyshortcuts="Meta+Enter Control+Enter"
          disabled={isPending}
          onClick={onContinue}
          shortcut={["Mod", "Enter"]}
          showShortcut
          variant="primary"
          {...settingsShortcutAttrs("save-booking")}
        >
          Continue
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </div>
  );
}
