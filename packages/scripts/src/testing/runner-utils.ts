import { Glob } from "bun";

function parseExtraArgs(extraArgs: string[]): {
  bunFlags: string[];
  ignorePattern?: string;
  explicitPaths: string[];
} {
  const bunFlags: string[] = [];
  const explicitPaths: string[] = [];
  let ignorePattern: string | undefined;

  for (let i = 0; i < extraArgs.length; i++) {
    const arg = extraArgs[i]!;

    if (arg === "--path-ignore-patterns") {
      ignorePattern = extraArgs[i + 1];
      i++;
      continue;
    }

    if (arg.startsWith("-")) {
      bunFlags.push(arg);
      continue;
    }

    if (!arg.includes("*")) {
      explicitPaths.push(arg.startsWith("./") ? arg : `./${arg}`);
      continue;
    }

    const matches = Array.from(new Glob(arg).scanSync("."));
    if (matches.length === 0) {
      console.error(`No test files matched: ${arg}`);
      process.exit(1);
    }

    for (const match of matches) {
      explicitPaths.push(
        match.startsWith("./") ? match : `./${match.replace(/^\.\//, "")}`,
      );
    }
  }

  return { bunFlags, ignorePattern, explicitPaths };
}

export function resolveTestTargets(
  scan: string,
  extraArgs: string[],
): { targets: string[]; bunFlags: string[]; label: string } {
  const { bunFlags, ignorePattern, explicitPaths } = parseExtraArgs(extraArgs);

  if (explicitPaths.length > 0) {
    return {
      targets: explicitPaths,
      bunFlags,
      label: `${explicitPaths.length} test files`,
    };
  }

  const flags = [...bunFlags];
  if (ignorePattern) {
    flags.push("--path-ignore-patterns", ignorePattern);
  }

  return { targets: [scan], bunFlags: flags, label: scan };
}

export function formatDuration(started: number): string {
  return ((Date.now() - started) / 1000).toFixed(1);
}
