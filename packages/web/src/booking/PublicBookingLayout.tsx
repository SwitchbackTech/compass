import { type PropsWithChildren } from "react";

interface PublicBookingLayoutProps extends PropsWithChildren {
  wide?: boolean;
}

/**
 * Public booking is a document-height page. The calendar shell clips
 * `html`/`body`/`#root` with `overflow: hidden`; `data-document-scroll`
 * opts this tree into native page scrolling so guests can reach later
 * time slots (see `index.css`).
 */
export function PublicBookingLayout({
  children,
  wide = false,
}: PublicBookingLayoutProps) {
  return (
    <div
      data-document-scroll
      className="relative min-h-dvh bg-background text-text"
    >
      <main
        className={`mx-auto flex w-full min-w-0 flex-col gap-6 px-4 py-10 ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
