import { readFile } from "node:fs/promises";
import path from "node:path";

const BUILD_ENVIRONMENTS = ["local", "staging", "production"] as const;

export type BuildEnvironment = (typeof BUILD_ENVIRONMENTS)[number];

function parseEnvFile(source: string): Record<string, string> {
  const entries = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .flatMap((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        return [];
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2");

      return [[key, value]] as const;
    });

  return Object.fromEntries(entries);
}

export function getBuildEnvironment(): BuildEnvironment {
  const buildEnvironment = process.env["BUILD_ENV"] ?? "local";

  if (!BUILD_ENVIRONMENTS.includes(buildEnvironment as BuildEnvironment)) {
    throw new Error(
      `Invalid BUILD_ENV value "${buildEnvironment}". Expected one of: ${BUILD_ENVIRONMENTS.join(", ")}.`,
    );
  }

  return buildEnvironment as BuildEnvironment;
}

export function getCompassRoot(packageDir: string): string {
  return path.resolve(packageDir, "../..");
}

export function getBackendEnvPath(
  packageDir: string,
  buildEnvironment: BuildEnvironment,
): string {
  const fileName =
    buildEnvironment === "production"
      ? ".env.production"
      : buildEnvironment === "staging"
        ? ".env.staging"
        : ".env.local";

  return path.resolve(getCompassRoot(packageDir), "packages/backend", fileName);
}

export async function loadBackendEnvForBuild(
  packageDir: string,
  buildEnvironment = getBuildEnvironment(),
): Promise<{ buildEnvironment: BuildEnvironment; envPath: string }> {
  const envPath = getBackendEnvPath(packageDir, buildEnvironment);
  const envFile = await readFile(envPath, "utf8").catch(() => undefined);

  if (!envFile) {
    throw new Error(`Missing build env file: ${envPath}`);
  }

  const parsedEnv = parseEnvFile(envFile);
  Object.assign(process.env, parsedEnv);

  return { buildEnvironment, envPath };
}
