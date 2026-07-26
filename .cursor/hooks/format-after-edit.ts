import { isAbsolute, relative, resolve } from "node:path";

type AfterFileEditInput = {
  file_path?: unknown;
};

const input = (await Bun.stdin.json()) as AfterFileEditInput;
if (typeof input.file_path !== "string") {
  process.exit(0);
}

const root = process.cwd();
const filePath = resolve(input.file_path);
const relativePath = relative(root, filePath);

if (
  relativePath === "" ||
  relativePath.startsWith("..") ||
  isAbsolute(relativePath)
) {
  process.exit(0);
}

const result = Bun.spawnSync(
  [
    "bunx",
    "biome",
    "check",
    "--write",
    "--assist-enabled=true",
    "--no-errors-on-unmatched",
    filePath,
  ],
  {
    cwd: root,
    stdout: "ignore",
    stderr: "inherit",
  },
);

process.exit(result.exitCode);
