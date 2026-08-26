import { PageJumpHintOverlay } from "@web/shortcuts/page-jump/PageJumpHintOverlay";
import {
  CALENDAR_PAGE_JUMP_TARGETS,
  type PageJumpTargets,
} from "@web/shortcuts/page-jump/page-jump.targets";
import { usePageJumpShortcut } from "@web/shortcuts/page-jump/usePageJumpShortcut";

/**
 * Self-contained mount for the page-level hold-Mod jump gesture: hook plus
 * hint overlay. Rendered once per view (Day, Week, Life), each passing its
 * own jump targets.
 */
export function PageJumpHints({
  targets = CALENDAR_PAGE_JUMP_TARGETS,
}: {
  targets?: PageJumpTargets;
}) {
  const { areHintsVisible } = usePageJumpShortcut(targets);
  return <PageJumpHintOverlay targets={targets} visible={areHintsVisible} />;
}
