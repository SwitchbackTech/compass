export function formatUserName(username) {
  return username.startsWith("@") ? username : "@" + username;
}
