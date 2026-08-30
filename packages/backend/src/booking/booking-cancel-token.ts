import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const generateCancelToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashCancelToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export const verifyCancelToken = (
  storedHash: string,
  rawToken: string,
): boolean => {
  const candidateHash = hashCancelToken(rawToken);
  const stored = Buffer.from(storedHash, "utf8");
  const candidate = Buffer.from(candidateHash, "utf8");
  if (stored.length !== candidate.length) {
    return false;
  }
  return timingSafeEqual(stored, candidate);
};
