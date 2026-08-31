import { useCopiedFlag } from "@web/booking/use-copied-flag";

interface PublicBookingCopyCancelUrlProps {
  cancelUrl: string;
}

export function PublicBookingCopyCancelUrl({
  cancelUrl,
}: PublicBookingCopyCancelUrlProps) {
  const { copied, copy } = useCopiedFlag(cancelUrl);

  return (
    <div className="mt-4 flex flex-col gap-2">
      <a
        href={cancelUrl}
        className="c-focus-ring break-all text-accent text-sm underline"
      >
        {cancelUrl}
      </a>
      <button
        type="button"
        onClick={copy}
        className="c-focus-ring self-start rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text"
      >
        {copied ? "Copied" : "Copy cancel link"}
      </button>
      <p role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </p>
    </div>
  );
}
