import {
  FacebookLogoIcon,
  InstagramLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  downloadLifeShareImage,
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

  const openShare = (platform: "facebook" | "x") => {
    const pageUrl = window.location.href;
    window.open(
      getSocialShareUrl(platform, pageUrl, lifespan),
      "_blank",
      "noopener,noreferrer",
    );
    void downloadLifeShareImage(shareData);
  };

  const shareToInstagram = async () => {
    const didShare = await shareLifeImage(shareData, window.location.href);
    if (didShare) return;

    await downloadLifeShareImage(shareData);
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  return (
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
  );
}
