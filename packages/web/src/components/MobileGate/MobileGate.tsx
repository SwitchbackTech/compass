import type React from "react";
import { useState } from "react";

const WAITLIST_URL = "https://tylerdane.kit.com/compass-mobile";

export const MobileGate: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleJoinWaitlist = () => {
    window.open(WAITLIST_URL, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older mobile browsers without clipboard permission.
      window.prompt("Copy this link and open it on a computer:", url);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="flex w-[400px] max-w-[90vw] flex-col items-center rounded border border-border bg-surface p-8 text-center">
        <h1 className="mb-6 font-medium font-sans text-2xl text-text">
          Open Compass on a computer
        </h1>
        <p className="mb-8 font-sans text-base text-text-muted leading-relaxed">
          Compass isn&apos;t built for phones yet. Copy this link and open it on
          a laptop or desktop to try the full experience.
        </p>
        <button
          type="button"
          onClick={() => void handleCopyLink()}
          className="mb-3 min-h-11 w-full cursor-pointer rounded border-none bg-accent px-8 py-2 font-medium font-sans text-base text-on-accent transition-opacity duration-300 hover:opacity-90 focus:outline focus:outline-2 focus:outline-accent focus:outline-offset-2"
        >
          {copied ? "Link copied" : "Copy link for desktop"}
        </button>
        <button
          type="button"
          onClick={handleJoinWaitlist}
          className="min-h-11 cursor-pointer rounded border-none bg-transparent px-8 py-2 font-medium font-sans text-base text-text-muted underline-offset-2 transition-opacity duration-300 hover:underline hover:opacity-90 focus:outline focus:outline-2 focus:outline-accent focus:outline-offset-2"
        >
          Join mobile waitlist
        </button>
      </div>
    </div>
  );
};
