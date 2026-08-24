import { type Stats } from "node:fs";
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

function cacheControl(filePath: string): string {
  // Only Bun's split chunks (chunk-<hash>.js and their .js.map) are
  // content-hashed, so their URLs change with their content. Everything else
  // keeps a stable name across deploys while its content changes — including
  // index.js, index.css, and index.js.map — and must revalidate via the
  // ETag/Last-Modified sent below.
  return path.basename(filePath).startsWith("chunk-")
    ? "public, max-age=31536000, immutable"
    : "no-cache";
}

function contentType(filePath: string): string | undefined {
  return textTypes[path.extname(filePath)];
}

async function fileResponse(
  request: Request,
  filePath: string,
  resolvedRoot: string,
): Promise<Response | null> {
  let resolvedFilePath: string;
  let fileStat: Stats;

  try {
    resolvedFilePath = await realpath(filePath);

    if (!isInsideRoot(resolvedRoot, resolvedFilePath)) {
      return null;
    }

    fileStat = await stat(resolvedFilePath);

    if (!fileStat.isFile()) {
      return null;
    }
  } catch {
    return null;
  }

  const headers = new Headers();
  const type = contentType(filePath);

  if (type) {
    headers.set("Content-Type", type);
  }

  const etag = `"${fileStat.size.toString(16)}-${fileStat.mtimeMs.toString(16)}"`;

  headers.set("Cache-Control", cacheControl(resolvedFilePath));
  headers.set("ETag", etag);
  headers.set("Last-Modified", fileStat.mtime.toUTCString());

  if (isNotModified(request, etag, fileStat.mtimeMs)) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(Bun.file(resolvedFilePath), { headers });
}

function isInsideRoot(resolvedRoot: string, resolvedPath: string): boolean {
  const relativePath = path.relative(resolvedRoot, resolvedPath);

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function isNotModified(
  request: Request,
  etag: string,
  mtimeMs: number,
): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");

  if (ifNoneMatch !== null) {
    return ifNoneMatch
      .split(",")
      .some((tag) => tag.trim().replace(/^W\//, "") === etag);
  }

  const ifModifiedSince = Date.parse(
    request.headers.get("if-modified-since") ?? "",
  );

  // HTTP dates carry whole seconds, so compare mtime at second precision.
  return (
    !Number.isNaN(ifModifiedSince) &&
    Math.floor(mtimeMs / 1000) * 1000 <= ifModifiedSince
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
      request,
      path.join(root, "index.html"),
      resolvedRoot,
    );

    if (!indexResponse) {
      return new Response("Compass web build not found", { status: 500 });
    }

    const requestedPath = path.join(root, safePath || "index.html");
    const staticResponse = await fileResponse(
      request,
      requestedPath,
      resolvedRoot,
    );

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
