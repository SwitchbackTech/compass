import { type PropsWithChildren } from "react";

/**
 * Public booking is a document-height page. The calendar shell clips
 * `html`/`body`/`#root` with `overflow: hidden`; `data-document-scroll`
 * opts this tree into native page scrolling so guests can reach later
 * time slots (see `index.css`).
 */
export function PublicBookingLayout({ children }: PropsWithChildren) {
  return (
    <div data-document-scroll className="min-h-dvh bg-background text-text">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
        {children}
      </main>
    </div>
  );
}
