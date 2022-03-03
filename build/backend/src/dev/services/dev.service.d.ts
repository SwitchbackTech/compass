declare class DevService {
  deleteWatchInfo(
    userId: string,
    channelId: string,
    resourceId: string
  ): Promise<"success" | "failed">;
  saveWatchInfo(
    userId: string,
    calendarId: string,
    channelId: string,
    resourceId: string
  ): Promise<"success" | "failed">;
  stopAllChannelWatches(userId: string): Promise<string[] | undefined>;
}
declare const _default: DevService;
export default _default;
//# sourceMappingURL=dev.service.d.ts.map
