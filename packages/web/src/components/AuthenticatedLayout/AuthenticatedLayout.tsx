import { useCallback } from "react";
import { Outlet } from "react-router-dom";
import { CalendarImportCompleteModal } from "@web/components/CalendarImportCompleteModal/CalendarImportCompleteModal";
import { SyncEventsOverlay } from "@web/components/SyncEventsOverlay/SyncEventsOverlay";
import { selectImportResults } from "@web/ducks/events/selectors/sync.selector";
import { importGCalSlice } from "@web/ducks/events/slices/sync.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useGlobalShortcuts } from "@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts";
import { CmdPaletteGuide } from "@web/views/Onboarding/components/CmdPaletteGuide";
import { OnboardingOverlayHost } from "@web/views/Onboarding/components/OnboardingOverlay/OnboardingOverlayHost";

/**
 * Layout component for authenticated routes
 * Handles shared logic like data refetching that should run for all authenticated views
 */
export const AuthenticatedLayout = () => {
  // Automatically refetch events when needed for all authenticated views
  useGlobalShortcuts();

  const dispatch = useAppDispatch();
  const importResults = useAppSelector(selectImportResults);

  const handleDismissModal = useCallback(() => {
    dispatch(importGCalSlice.actions.clearImportResults(undefined));
  }, [dispatch]);

  return (
    <>
      <Outlet />
      <OnboardingOverlayHost />
      <CmdPaletteGuide />
      <SyncEventsOverlay />
      {importResults && (
        <CalendarImportCompleteModal
          eventsCount={importResults.eventsCount}
          calendarsCount={importResults.calendarsCount}
          onDismiss={handleDismissModal}
        />
      )}
    </>
  );
};
