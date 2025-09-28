export enum DesktopOS {
  Linux = "linux",
  MacOS = "mac_os",
  Windows = "windows",
  Unknown = "unknown",
}

export const getDesktopOS = (): DesktopOS | undefined => {
  const userAgent = window.navigator.userAgent;

  if (userAgent.indexOf("Win") !== -1) return DesktopOS.Windows;
  else if (userAgent.indexOf("Mac") !== -1) return DesktopOS.MacOS;
  else if (userAgent.indexOf("Linux") !== -1) return DesktopOS.Linux;

  return DesktopOS.Unknown;
};
