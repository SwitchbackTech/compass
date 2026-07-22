import { WEEKS_PER_ROW } from "./life.utils";

export interface LifeShareData {
  lifespan: number;
  totalDots: number;
  weeksLived: number;
}

type SocialPlatform = "facebook" | "x";

const SHARE_TITLE = "Life in Weeks";
const SHARE_URL = "compasscalendar.com/life";

export function getLifeShareText(lifespan: number) {
  return `This is my life if I live to ${lifespan}.`;
}

export function getSocialShareUrl(
  platform: SocialPlatform,
  pageUrl: string,
  lifespan: number,
) {
  const url = new URL(
    platform === "x"
      ? "https://x.com/intent/post"
      : "https://www.facebook.com/sharer/sharer.php",
  );

  if (platform === "x") {
    url.searchParams.set("text", getLifeShareText(lifespan));
    url.searchParams.set("url", pageUrl);
  } else {
    url.searchParams.set("quote", getLifeShareText(lifespan));
    url.searchParams.set("u", pageUrl);
  }
  return url.toString();
}

export function getCleanLifeShareUrl(pageUrl: string) {
  const url = new URL(pageUrl);
  url.searchParams.delete("age");
  url.searchParams.delete("variation");
  return url.toString();
}

function createCanvas(data: LifeShareData) {
  const canvas = document.createElement("canvas");
  const rows = Math.ceil(data.totalDots / WEEKS_PER_ROW);
  const dotSize = 10;
  const dotGap = 7;
  const gridWidth = WEEKS_PER_ROW * (dotSize + dotGap) - dotGap;
  const width = 1080;
  const left = Math.round((width - gridWidth) / 2);
  const top = 230;

  canvas.width = width;
  canvas.height = Math.max(640, top + rows * (dotSize + 4) + 96);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create share image");

  context.fillStyle = "#f3eee2";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#403a2f";
  context.font = "600 44px system-ui, sans-serif";
  context.fillText(SHARE_TITLE, left, 82);
  context.font = "32px system-ui, sans-serif";
  context.fillStyle = "#5e5847";
  context.fillText(getLifeShareText(data.lifespan), left, 132);

  for (let dotIndex = 0; dotIndex < data.totalDots; dotIndex += 1) {
    const row = Math.floor(dotIndex / WEEKS_PER_ROW);
    const column = dotIndex % WEEKS_PER_ROW;
    context.fillStyle =
      dotIndex === data.weeksLived && dotIndex < data.totalDots
        ? "#7a7771"
        : dotIndex < data.weeksLived
          ? "#2b2a27"
          : "#d8d0c0";
    context.fillRect(
      left + column * (dotSize + dotGap),
      top + row * (dotSize + 4),
      dotSize,
      dotSize,
    );
  }

  const linkY = canvas.height - 42;
  context.font = "24px system-ui, sans-serif";
  context.fillStyle = "#5e5847";
  const linkWidth = context.measureText(SHARE_URL).width;
  const linkX = Math.round((canvas.width - linkWidth) / 2);
  context.fillText(SHARE_URL, linkX, linkY);
  context.fillRect(linkX, linkY + 5, linkWidth, 1);

  return canvas;
}

export async function createLifeShareImage(data: LifeShareData) {
  const canvas = createCanvas(data);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((image) => {
      if (image) {
        resolve(image);
      } else {
        reject(new Error("Unable to create share image"));
      }
    }, "image/png");
  });

  return new File([blob], "my-life-in-weeks.png", { type: "image/png" });
}

export async function downloadLifeShareImage(data: LifeShareData) {
  const image = await createLifeShareImage(data);
  const url = URL.createObjectURL(image);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = image.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareLifeImage(data: LifeShareData, pageUrl: string) {
  if (!navigator.share || !navigator.canShare) return false;

  const image = await createLifeShareImage(data);
  const shareData = {
    files: [image],
    text: getLifeShareText(data.lifespan),
    title: SHARE_TITLE,
    url: pageUrl,
  };
  if (!navigator.canShare(shareData)) return false;

  try {
    await navigator.share(shareData);
    return true;
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError";
  }
}
