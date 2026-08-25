import { PageJumpHintOverlay } from "@web/shortcuts/page-jump/PageJumpHintOverlay";
import { usePageJumpShortcut } from "@web/shortcuts/page-jump/usePageJumpShortcut";

/**
 * Self-contained mount for the page-level hold-Mod jump gesture: hook plus
 * hint overlay. Rendered once per calendar view (Day, Week).
 */
export function PageJumpHints() {
  const { areHintsVisible } = usePageJumpShortcut();
  return <PageJumpHintOverlay visible={areHintsVisible} />;
}
