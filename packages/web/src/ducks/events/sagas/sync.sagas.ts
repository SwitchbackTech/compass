import { type AxiosError } from "axios";
import { call, put } from "@redux-saga/core/effects";
import { GOOGLE_REVOKED } from "@core/constants/sse.constants";
import { getApiErrorCode } from "@web/common/apis/compass.api.util";
import { GOOGLE_REPAIR_FAILED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { SyncApi } from "../../../common/apis/sync.api";
import { importGCalSlice } from "../slices/sync.slice";

type NoArgActionCreator<T> = T extends (...args: never[]) => infer R
  ? () => R
  : never;

const errorAction = importGCalSlice.actions
  .error as unknown as NoArgActionCreator<typeof importGCalSlice.actions.error>;

export function* importAutoGCal() {
  try {
    yield call(() => SyncApi.importGCal());
  } catch (error) {
    console.error("Failed to start Google Calendar auto-import", error);
  }
}

export function* importRepairGCal() {
  try {
    yield call(() => SyncApi.importGCal({ force: true }));
  } catch (error) {
    yield put(importGCalSlice.actions.stopRepair());

    const isGoogleRevoked =
      getApiErrorCode(error as AxiosError) === GOOGLE_REVOKED;
    if (isGoogleRevoked) {
      return;
    }

    yield put(
      importGCalSlice.actions.setImportError(
        "Google Calendar repair failed. Please try again.",
      ),
    );
    yield put(errorAction());
    yield call(
      showErrorToast,
      "Google Calendar repair failed. Please try again.",
      {
        toastId: GOOGLE_REPAIR_FAILED_TOAST_ID,
      },
    );
  }
}
