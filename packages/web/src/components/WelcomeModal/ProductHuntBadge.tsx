const PRODUCT_HUNT_URL =
  "https://www.producthunt.com/products/compass-calendar?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-compass-calendar-2";
const PRODUCT_HUNT_BADGE_SRC =
  "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1222394&theme=dark&t=1786683338797";

export function ProductHuntBadge() {
  return (
    <a
      href={PRODUCT_HUNT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="c-focus-ring mx-auto flex w-fit rounded-sm"
    >
      <img
        alt="Compass Calendar - The keyboard-first calendar. Get organized quickly. | Product Hunt"
        width={250}
        height={54}
        src={PRODUCT_HUNT_BADGE_SRC}
      />
    </a>
  );
}
