import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const srcRoot = join(import.meta.dir, "../..");
const files = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

test("web source has no styled-components imports", () => {
  const packageName = ["styled", "components"].join("-");
  const offenders = files(srcRoot).filter(
    (file) =>
      /\.[jt]sx?$/.test(file) &&
      readFileSync(file, "utf8").includes(`from "${packageName}"`),
  );
  expect(offenders).toEqual([]);
});

test("the removed styling package and Babel plugin stay absent", () => {
  const repositoryRoot = resolve(srcRoot, "../../..");
  const manifest = readFileSync(
    join(repositoryRoot, "packages/web/package.json"),
    "utf8",
  );
  const babelConfig = readFileSync(
    join(repositoryRoot, "babel.config.js"),
    "utf8",
  );
  const packageName = ["styled", "components"].join("-");

  expect(manifest).not.toContain(packageName);
  expect(babelConfig).not.toContain(`babel-plugin-${packageName}`);
});
