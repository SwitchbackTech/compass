import {
  FacebookLogoIcon,
  InstagramLogoIcon,
  ShuffleIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { getRandomLifeQuote } from "./life-quotes";
import {
  downloadLifeShareImage,
  getCleanLifeShareUrl,
  getSocialShareUrl,
  type LifeShareData,
  shareLifeImage,
} from "./life-share";

interface LifeShareButtonsProps extends LifeShareData {}

const iconButtonClassName =
  "flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function LifeShareButtons({
  lifespan,
  totalDots,
  weeksLived,
}: LifeShareButtonsProps) {
  const shareData = { lifespan, totalDots, weeksLived };
  const [quote, setQuote] = useState(getRandomLifeQuote);
  const pageUrl = getCleanLifeShareUrl(window.location.href);

  const openShare = (platform: "facebook" | "x") => {
    window.open(
      getSocialShareUrl(platform, pageUrl, lifespan),
      "_blank",
      "noopener,noreferrer",
    );
    void downloadLifeShareImage(shareData);
  };

  const shareToInstagram = async () => {
    const didShare = await shareLifeImage(shareData, pageUrl);
    if (didShare) return;

    await downloadLifeShareImage(shareData);
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <section className="flex flex-col gap-2 text-text-muted">
        <div className="flex items-start gap-1">
          <blockquote aria-live="polite" className="min-w-0 flex-1 italic">
            {quote}
          </blockquote>
          <TooltipWrapper description="Show another quote">
            <button
              aria-label="Shuffle life quote"
              className={iconButtonClassName}
              onClick={() => setQuote((current) => getRandomLifeQuote(current))}
              type="button"
            >
              <ShuffleIcon aria-hidden="true" size={17} />
            </button>
          </TooltipWrapper>
        </div>
      </section>

      <section className="flex flex-col gap-2 text-text-muted">
        <h2 className="font-semibold text-text">Share</h2>
        <div className="flex items-center gap-1">
          <TooltipWrapper description="Share on X (downloads image)">
            <button
              aria-label="Share on X"
              className={iconButtonClassName}
              onClick={() => openShare("x")}
              type="button"
            >
              <XLogoIcon aria-hidden="true" size={17} />
            </button>
          </TooltipWrapper>
          <TooltipWrapper description="Share on Facebook (downloads image)">
            <button
              aria-label="Share on Facebook"
              className={iconButtonClassName}
              onClick={() => openShare("facebook")}
              type="button"
            >
              <FacebookLogoIcon aria-hidden="true" size={17} />
            </button>
          </TooltipWrapper>
          <TooltipWrapper description="Share on Instagram">
            <button
              aria-label="Share on Instagram"
              className={iconButtonClassName}
              onClick={() => void shareToInstagram()}
              type="button"
            >
              <InstagramLogoIcon aria-hidden="true" size={17} />
            </button>
          </TooltipWrapper>
        </div>
      </section>
    </>
  );
}
