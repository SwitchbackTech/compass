const activeGoogleSyncUsers = new Set<string>();

export const tryBeginGoogleSync = (userId: string): boolean => {
  if (activeGoogleSyncUsers.has(userId)) return false;

  activeGoogleSyncUsers.add(userId);
  return true;
};

export const endGoogleSync = (userId: string): void => {
  activeGoogleSyncUsers.delete(userId);
};

export const isGoogleSyncActive = (userId: string): boolean =>
  activeGoogleSyncUsers.has(userId);

export const resetGoogleSyncActivityForTests = (): void => {
  activeGoogleSyncUsers.clear();
};
