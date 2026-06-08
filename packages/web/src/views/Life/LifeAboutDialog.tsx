import { InfoIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";

const BLOG_LINK =
  "/blog/visualize-your-life-in-weeks?utm_source=website&utm_medium=life_in_weeks_dialog&utm_campaign=blog_link";

export function LifeAboutDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Information"
        className="inline-flex h-9 w-9 items-center justify-center rounded text-text-light transition-colors hover:bg-panel-bg hover:text-text-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <InfoIcon aria-hidden="true" size={20} weight="bold" />
      </button>
      {isOpen ? (
        <OverlayPanel
          title="About Life in Weeks"
          onDismiss={() => setIsOpen(false)}
          variant="modal"
        >
          <div className="flex w-full flex-col gap-4 text-sm text-text-light">
            <p>
              This page shows your life as a grid of weeks. Each dot represents
              one week of your life, and each row represents one year.
            </p>
            <p>
              The default death age is set to 79. However, life expectancy
              varies significantly by country and other factors.
            </p>
            <p>
              For more information, see{" "}
              <a
                className="text-accent-primary underline hover:no-underline"
                href={BLOG_LINK}
                rel="noopener noreferrer"
                target="_blank"
              >
                Visualize Your Life in Weeks
              </a>
              .
            </p>
          </div>
        </OverlayPanel>
      ) : null}
    </>
  );
}
