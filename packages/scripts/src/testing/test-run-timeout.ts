/**
 * Wall-clock suite budget + streamed output capture for mongo-backed test runs.
 * Used by test-mongo-env.ts to fail fast with actionable hang/slow diagnostics.
 */

export type TestRunPhase = "starting-mongo" | "running-tests";

const SLOW_TEST_MS = 5_000;

export function parseMaxSeconds(
  envValue: string | undefined,
  fallback?: number,
): number | undefined {
  if (envValue === undefined || envValue === "") {
    return fallback;
  }
  const parsed = Number(envValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(`Invalid COMPASS_TEST_MAX_SECONDS: ${envValue}`);
    process.exit(2);
  }
  return parsed;
}

export function remainingSeconds(
  maxSeconds: number | undefined,
  startedMs: number,
): number | undefined {
  if (maxSeconds === undefined) {
    return undefined;
  }
  const elapsed = (Date.now() - startedMs) / 1000;
  return Math.max(0.1, maxSeconds - elapsed);
}

export function createOutputTee(maxLines = 50) {
  const lines: string[] = [];

  function append(text: string) {
    for (const line of text.split(/\r?\n/)) {
      if (line.trim().length === 0) {
        continue;
      }
      lines.push(line);
      if (lines.length > maxLines) {
        lines.shift();
      }
    }
  }

  function attach(
    stream: ReadableStream<Uint8Array>,
    target: NodeJS.WriteStream,
  ) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    void (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        target.write(chunk);
        append(chunk);
      }
    })();
  }

  return { lines, append, attach };
}

/** Best-effort guess of the file or test name last seen in Bun output. */
export function extractLikelyHungTarget(lines: string[]): string | undefined {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;

    const fileHeader = line.match(
      /^(\.\/)?packages\/[^\s:]+\.(?:test|spec)\.[tj]sx?:$/,
    );
    if (fileHeader) {
      return fileHeader[0]!.replace(/:$/, "");
    }

    const named = line.match(/^\((?:pass|fail|skip|todo)\)\s+(.+?)\s+\[/);
    if (named) {
      return named[1];
    }
  }

  return undefined;
}

export function extractSlowTests(lines: string[]): string[] {
  const slow: string[] = [];

  for (const line of lines) {
    const match = line.match(
      /^\((?:pass|fail)\)\s+(.+?)\s+\[(\d+(?:\.\d+)?)(ms|s)\]/,
    );
    if (!match) {
      continue;
    }

    const name = match[1]!;
    const amount = Number(match[2]!);
    const unit = match[3]!;
    const ms = unit === "s" ? amount * 1000 : amount;

    if (ms >= SLOW_TEST_MS) {
      slow.push(`${name} (${match[2]}${unit})`);
    }
  }

  return slow;
}

export function reportSuiteTimeout(opts: {
  pkg: string;
  label: string;
  maxSeconds: number;
  startedMs: number;
  phase: TestRunPhase;
  outputLines: string[];
}): never {
  const elapsed = ((Date.now() - opts.startedMs) / 1000).toFixed(1);
  const hung = extractLikelyHungTarget(opts.outputLines);
  const slow = extractSlowTests(opts.outputLines);

  console.error(`\n${opts.pkg} tests exceeded ${opts.maxSeconds}s limit (ran ${elapsed}s).`);
  console.error(`Phase: ${describePhase(opts.phase)}`);
  console.error(`Target: ${opts.label}`);

  if (hung) {
    console.error(`Likely hung on: ${hung}`);
  }

  if (slow.length > 0) {
    console.error("Slow tests seen before timeout:");
    for (const entry of slow.slice(-5)) {
      console.error(`  - ${entry}`);
    }
  }

  if (opts.outputLines.length > 0) {
    console.error("\nLast output:");
    for (const line of opts.outputLines.slice(-15)) {
      console.error(`  ${line}`);
    }
  }

  console.error(
    "\nRaise the budget with COMPASS_TEST_MAX_SECONDS or fix hung/slow tests.",
    "Per-test default is Bun --timeout (see testing-playbook).",
  );
  process.exit(124);
}

function describePhase(phase: TestRunPhase): string {
  switch (phase) {
    case "starting-mongo":
      return "starting in-memory Mongo replica set";
    case "running-tests":
      return "running bun test";
  }
}

export async function waitForProcessExit(
  proc: ReturnType<typeof Bun.spawn>,
  maxSeconds?: number,
): Promise<number> {
  if (maxSeconds === undefined) {
    return (await proc.exited) ?? 1;
  }

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, maxSeconds * 1000);

  const code = (await proc.exited) ?? 1;
  clearTimeout(timer);

  if (timedOut) {
    return 124;
  }

  return code;
}

export async function withDeadline<T>(
  promise: Promise<T>,
  maxSeconds: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("deadline exceeded"));
    }, maxSeconds * 1000);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export function reportSlowTestsAfterRun(opts: {
  pkg: string;
  outputLines: string[];
  maxSeconds?: number;
  elapsedSeconds: number;
}): void {
  const slow = extractSlowTests(opts.outputLines);
  if (slow.length > 0) {
    console.warn(`\nSlow tests in ${opts.pkg} (>= ${SLOW_TEST_MS / 1000}s each):`);
    for (const entry of slow.slice(0, 10)) {
      console.warn(`  - ${entry}`);
    }
    if (slow.length > 10) {
      console.warn(`  ... and ${slow.length - 10} more`);
    }
  }

  if (opts.maxSeconds !== undefined && opts.elapsedSeconds > opts.maxSeconds * 0.8) {
    console.warn(
      `Warning: ${opts.pkg} tests used ${opts.elapsedSeconds.toFixed(1)}s of the ${opts.maxSeconds}s budget.`,
    );
  }
}

export function defaultPerTestTimeoutMs(pkg: string): number | undefined {
  if (pkg === "backend") {
    return 15_000;
  }
  return undefined;
}

export function appendPerTestTimeout(
  bunFlags: string[],
  pkg: string,
): string[] {
  const hasTimeout = bunFlags.some(
    (flag) => flag === "--timeout" || flag.startsWith("--timeout="),
  );
  if (hasTimeout) {
    return bunFlags;
  }

  const timeoutMs = defaultPerTestTimeoutMs(pkg);
  if (timeoutMs === undefined) {
    return bunFlags;
  }

  return ["--timeout", String(timeoutMs), ...bunFlags];
}
