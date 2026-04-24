import syncImportRunner from "@backend/sync/services/import/sync.import-runner";
import syncMaintenanceRunner from "@backend/sync/services/maintain/sync.maintenance-runner";
import syncNotificationService from "@backend/sync/services/notify/sync.notification.service";
import syncWatchService from "@backend/sync/services/watch/sync.watch.service";

class SyncService {
  cleanupStaleWatchChannel = syncNotificationService.cleanupStaleWatchChannel;

  deleteAllByGcalId = syncWatchService.deleteAllByGcalId;

  deleteAllByUser = syncWatchService.deleteAllByUser;

  deleteByIntegration = syncWatchService.deleteByIntegration;

  deleteWatchesByUser = syncWatchService.deleteWatchesByUser;

  handleGcalNotification = syncNotificationService.handleGcalNotification;

  importFull = syncImportRunner.importFull;

  importIncremental = syncImportRunner.importIncremental;

  refreshWatch = syncWatchService.refreshWatch;

  restartGoogleCalendarSync = syncImportRunner.restartGoogleCalendarSync;

  runMaintenance = syncMaintenanceRunner.runMaintenance;

  runMaintenanceByUser = syncMaintenanceRunner.runMaintenanceByUser;

  startGoogleCalendarSync = syncImportRunner.startGoogleCalendarSync;

  startWatchingGcalCalendars = syncWatchService.startWatchingGcalCalendars;

  startWatchingGcalEvents = syncWatchService.startWatchingGcalEvents;

  startWatchingGcalResources = syncWatchService.startWatchingGcalResources;

  stopWatch = syncWatchService.stopWatch;

  stopWatches = syncWatchService.stopWatches;
}

export default new SyncService();
