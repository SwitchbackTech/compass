import { useCallback, useEffect } from "react";
import { useStore } from "react-redux";
import {
  GOOGLE_REVOKED,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  USER_METADATA,
} from "@core/constants/sse.constants";
import { type ImportGCalEndPayload } from "@core/types/sse.types";
import { type UserMetadata } from "@core/types/user.types";
import { handleGoogleRevoked } from "@web/auth/google/google.auth.util";
import { reconcileGoogleCalendarImportState } from "@web/auth/user/util/user-metadata.import.util";
import { refreshUserMetadata } from "@web/auth/user/util/user-metadata.util";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { userMetadataSlice } from "@web/ducks/auth/slices/user-metadata.slice";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import {
  importGCalSlice,
  triggerFetch,
} from "@web/ducks/events/slices/sync.slice";
import { type RootState } from "@web/store";
import { useAppDispatch } from "@web/store/store.hooks";
import { sseEmitter } from "../client/sse.client";

export const useGcalSSE = () => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  const onImportEnd = useCallback(
    (payload?: ImportGCalEndPayload) => {
      if (payload?.operation === "REPAIR") {
        dispatch(importGCalSlice.actions.stopRepair());
      }

      if (payload?.status === "ERRORED") {
        dispatch(importGCalSlice.actions.setImportError(payload.message));
        dispatch(importGCalSlice.actions.error(undefined));
        void refreshUserMetadata();
        if (payload.operation === "REPAIR") {
          showErrorToast(payload.message, {
            toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
          });
        }
        return;
      }

      if (payload?.status === "IGNORED") {
        dispatch(importGCalSlice.actions.success(undefined));
        void refreshUserMetadata();
        return;
      }

      if (payload?.status === "COMPLETED") {
        dispatch(
          importGCalSlice.actions.setImportResults({
            eventsCount: payload.eventsCount,
            calendarsCount: payload.calendarsCount,
          }),
        );
        dispatch(importGCalSlice.actions.success(undefined));
      }

      void refreshUserMetadata();
      dispatch(
        triggerFetch({
          reason: Sync_AsyncStateContextReason.IMPORT_COMPLETE,
        }),
      );
    },
    [dispatch],
  );

  const onGoogleRevoked = useCallback(() => {
    dispatch(importGCalSlice.actions.stopRepair());
    handleGoogleRevoked();
  }, [dispatch]);

  const onImportStart = useCallback(() => {
    dispatch(importGCalSlice.actions.request());
  }, [dispatch]);

  const onMetadataFetch = useCallback(
    (metadata: UserMetadata) => {
      dispatch(userMetadataSlice.actions.set(metadata));
      reconcileGoogleCalendarImportState({
        dispatch,
        getState: () => store.getState(),
        metadata,
      });
    },
    [dispatch, store],
  );

  useEffect(() => {
    const importEndHandler = (e: Event) => {
      const payload = JSON.parse(
        String((e as MessageEvent).data),
      ) as ImportGCalEndPayload;
      onImportEnd(payload);
    };

    const googleRevokedHandler = () => {
      onGoogleRevoked();
    };

    const importStartHandler = () => {
      onImportStart();
    };

    const userMetadataHandler = (e: Event) => {
      const metadata = JSON.parse(
        String((e as MessageEvent).data),
      ) as UserMetadata;
      onMetadataFetch(metadata);
    };

    sseEmitter.on(IMPORT_GCAL_START, importStartHandler);
    sseEmitter.on(IMPORT_GCAL_END, importEndHandler);
    sseEmitter.on(GOOGLE_REVOKED, googleRevokedHandler);
    sseEmitter.on(USER_METADATA, userMetadataHandler);

    return () => {
      sseEmitter.off(IMPORT_GCAL_START, importStartHandler);
      sseEmitter.off(IMPORT_GCAL_END, importEndHandler);
      sseEmitter.off(GOOGLE_REVOKED, googleRevokedHandler);
      sseEmitter.off(USER_METADATA, userMetadataHandler);
    };
  }, [onImportEnd, onImportStart, onGoogleRevoked, onMetadataFetch]);
};
