import { useCopiedFlag } from "@web/booking/use-copied-flag";

interface PublicBookingCopyCancelUrlProps {
  cancelUrl: string;
}

export function PublicBookingCopyCancelUrl({
  cancelUrl,
}: PublicBookingCopyCancelUrlProps) {
  const { copied, copy } = useCopiedFlag(cancelUrl);

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={copy}
        className="c-button c-button-secondary"
      >
        {copied ? "Copied" : "Copy cancel link"}
      </button>
      <a
        href={cancelUrl}
        className="c-focus-ring text-accent text-sm underline"
      >
        Cancel this booking
      </a>
      <p role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </p>
    </div>
  );
}
