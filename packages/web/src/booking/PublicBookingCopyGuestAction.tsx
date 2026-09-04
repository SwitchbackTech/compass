import { useCopiedFlag } from "@web/booking/use-copied-flag";

interface PublicBookingCopyGuestActionProps {
  url: string;
  copyLabel: string;
  linkLabel: string;
}

export function PublicBookingCopyGuestAction({
  url,
  copyLabel,
  linkLabel,
}: PublicBookingCopyGuestActionProps) {
  const { copied, copy } = useCopiedFlag(url);

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={copy}
        className="c-button c-button-secondary"
      >
        {copied ? "Copied" : copyLabel}
      </button>
      <a href={url} className="c-focus-ring text-accent text-sm underline">
        {linkLabel}
      </a>
      {copied ? (
        <p role="status" className="sr-only">
          Copied
        </p>
      ) : null}
    </div>
  );
}
