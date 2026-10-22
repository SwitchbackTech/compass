import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type UserMetadata } from "@core/types/user.types";
import { UserApi } from "@web/api/user.api";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { track } from "@web/auth/posthog/track";
import {
  selectUserMetadataStatus,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { MODAL_DISMISS_MS } from "@web/common/constants/motion.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import {
  hasSeenLifeViewIntroLocally,
  lifeViewIntroMetadataPatch,
  markLifeViewIntroSeenLocally,
  readLifeViewIntroSeenFromMetadata,
} from "@web/views/Life/life-view-intro.util";

type LifeViewIntroDependencies = {
  useSession: () => { authenticated: boolean };
  useMetadata: () => {
    metadata: UserMetadata | null;
    status: ReturnType<typeof selectUserMetadataStatus>;
  };
  hasSeenLocally: typeof hasSeenLifeViewIntroLocally;
  markSeenLocally: typeof markLifeViewIntroSeenLocally;
  readSeenFromMetadata: typeof readLifeViewIntroSeenFromMetadata;
  persistSeenOnServer: (
    patch: Pick<UserMetadata, "onboarding">,
  ) => Promise<void>;
  trackEvent: typeof track;
};

export type LifeViewIntroDismissReason = "primary" | "escape";

export type LifeViewIntroState = {
  mounted: boolean;
  closing: boolean;
  dismiss: (reason: LifeViewIntroDismissReason) => void;
};

function selectLifeViewIntroEligible(input: {
  authenticated: boolean;
  metadataStatus: ReturnType<typeof selectUserMetadataStatus>;
  seenLocally: boolean;
  seenOnServer: boolean;
  dismissedThisVisit: boolean;
}): boolean {
  if (input.dismissedThisVisit || input.seenLocally || input.seenOnServer) {
    return false;
  }
  if (input.authenticated && input.metadataStatus !== "loaded") {
    return false;
  }
  return true;
}

export function createUseLifeViewIntro({
  useSession,
  useMetadata,
  hasSeenLocally,
  markSeenLocally,
  readSeenFromMetadata,
  persistSeenOnServer,
  trackEvent,
}: LifeViewIntroDependencies) {
  return function useLifeViewIntro(): LifeViewIntroState {
    const { authenticated } = useSession();
    const { metadata, status: metadataStatus } = useMetadata();
    const seenOnServer = authenticated && readSeenFromMetadata(metadata);
    const [dismissedThisVisit, setDismissedThisVisit] = useState(false);
    const { closing, beginDismiss } = useDismissTransition(MODAL_DISMISS_MS);

    useEffect(() => {
      if (seenOnServer) markSeenLocally();
    }, [seenOnServer]);

    const eligible = useMemo(
      () =>
        selectLifeViewIntroEligible({
          authenticated,
          metadataStatus,
          seenLocally: hasSeenLocally(),
          seenOnServer,
          dismissedThisVisit,
        }),
      [authenticated, metadataStatus, seenOnServer, dismissedThisVisit],
    );

    const shownRef = useRef(false);

    useEffect(() => {
      if (!eligible || shownRef.current) return;
      shownRef.current = true;
      trackEvent("life_view_intro_shown");
    }, [eligible]);

    const finalizeDismiss = useCallback(
      (reason: LifeViewIntroDismissReason) => {
        markSeenLocally();
        setDismissedThisVisit(true);
        trackEvent("life_view_intro_dismissed", { cta: reason });
        if (authenticated) {
          void persistSeenOnServer(lifeViewIntroMetadataPatch()).catch(() => {
            // Device-local persistence already prevents repeat on this browser.
          });
        }
      },
      [authenticated],
    );

    const dismiss = useCallback(
      (reason: LifeViewIntroDismissReason) => {
        beginDismiss(() => finalizeDismiss(reason));
      },
      [beginDismiss, finalizeDismiss],
    );

    return {
      mounted: eligible || closing,
      closing,
      dismiss,
    };
  };
}

export const useLifeViewIntro = createUseLifeViewIntro({
  useSession: () => useContext(SessionContext),
  useMetadata: () => {
    const metadata = useUserMetadataStore((state) => state.current);
    const status = useUserMetadataStore(selectUserMetadataStatus);
    return { metadata, status };
  },
  hasSeenLocally: hasSeenLifeViewIntroLocally,
  markSeenLocally: markLifeViewIntroSeenLocally,
  readSeenFromMetadata: readLifeViewIntroSeenFromMetadata,
  persistSeenOnServer: async (patch) => {
    await UserApi.updateMetadata(patch);
  },
  trackEvent: track,
});
