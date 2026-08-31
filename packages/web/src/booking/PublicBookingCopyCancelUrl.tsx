import { useState } from "react";
import { copyText } from "@web/common/utils/clipboard/clipboard.util";

interface PublicBookingCopyCancelUrlProps {
  cancelUrl: string;
}

export function PublicBookingCopyCancelUrl({
  cancelUrl,
}: PublicBookingCopyCancelUrlProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void copyText(cancelUrl).then((didCopy) => {
      if (!didCopy) {
        return;
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      <a
        href={cancelUrl}
        className="break-all text-accent text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {cancelUrl}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="self-start rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {copied ? "Copied" : "Copy cancel link"}
      </button>
      <p role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </p>
    </div>
  );
}
