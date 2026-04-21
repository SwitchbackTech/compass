import { realpath, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PORT = 9080;
const MAX_PORT = 65535;
const MIN_PORT = 1;

const port = parsePort(process.env.WEB_PORT);
const root =
  process.env.WEB_ROOT || path.resolve(import.meta.dir, "../build/web");
const textTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function badRequest(): Response {
  return new Response("Bad Request", { status: 400 });
}

function contentType(filePath: string): string | undefined {
  return textTypes[path.extname(filePath)];
}

async function fileResponse(
  filePath: string,
  resolvedRoot: string,
): Promise<Response | null> {
  let resolvedFilePath: string;

  try {
    resolvedFilePath = await realpath(filePath);

    if (!isInsideRoot(resolvedRoot, resolvedFilePath)) {
      return null;
    }

    if (!(await stat(resolvedFilePath)).isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  const file = Bun.file(resolvedFilePath);
  const type = contentType(filePath);

  return new Response(file, {
    headers: type ? { "Content-Type": type } : {},
  });
}

function isInsideRoot(resolvedRoot: string, resolvedPath: string): boolean {
  const relativePath = path.relative(resolvedRoot, resolvedPath);

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function parsePort(portValue: string | undefined): number {
  if (portValue === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(portValue)) {
    return rejectPort(portValue);
  }

  const parsedPort = Number(portValue);

  if (
    !Number.isSafeInteger(parsedPort) ||
    parsedPort < MIN_PORT ||
    parsedPort > MAX_PORT
  ) {
    return rejectPort(portValue);
  }

  return parsedPort;
}

function rejectPort(portValue: string): never {
  console.error(
    `Invalid WEB_PORT "${portValue}". Expected an integer from 1 to 65535.`,
  );
  process.exit(1);
}

Bun.serve({
  hostname: "0.0.0.0",
  port,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname: string;

    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return badRequest();
    }

    if (pathname.includes("\0")) {
      return badRequest();
    }

    const safePath = path
      .normalize(pathname)
      .replace(/^(\.\.(\/|\\|$))+/, "")
      .replace(/^\/+/, "");
    let resolvedRoot: string;

    try {
      resolvedRoot = await realpath(root);
    } catch {
      return new Response("Compass web build not found", { status: 500 });
    }

    const indexResponse = await fileResponse(
      path.join(root, "index.html"),
      resolvedRoot,
    );

    if (!indexResponse) {
      return new Response("Compass web build not found", { status: 500 });
    }

    const requestedPath = path.join(root, safePath || "index.html");
    const staticResponse = await fileResponse(requestedPath, resolvedRoot);

    if (staticResponse) {
      return staticResponse;
    }

    if (path.extname(safePath)) {
      return new Response("Not Found", { status: 404 });
    }

    return indexResponse;
  },
});

console.log(`Compass web server listening on http://0.0.0.0:${port}`);
