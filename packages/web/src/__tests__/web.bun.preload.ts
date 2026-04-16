import { JSDOM } from "jsdom";
import { afterEach, jest, mock } from "bun:test";
import { createRequire } from "node:module";
import ts from "typescript";
import { mockNodeModules } from "./__mocks__/mock.setup";

declare global {
  var __webReapplyModuleMocks: (() => void) | undefined;
}

const require = createRequire(import.meta.path);
const { applyBunJestCompat } = require(
  "../../../scripts/src/testing/apply-bun-jest-compat.cjs",
) as {
  applyBunJestCompat: (
    bunJest: typeof jest,
    bunMock: typeof mock,
  ) => void;
};
const TEST_GLOBALS_IMPORT =
  'import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest, mock, spyOn, test } from "@web/__tests__/bun-test-shim";\nimport { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);\nafterAll(() => {\n  mock.restore();\n  globalThis.__webReapplyModuleMocks?.();\n});';
const EMPTY_STYLE_STUB_PATH = new URL(
  "./__mocks__/asset-empty-style.js",
  import.meta.url,
).pathname;
const FILE_STUB_PATH = new URL(
  "./__mocks__/asset-file-stub.js",
  import.meta.url,
).pathname;
const SVG_STUB_PATH = new URL(
  "./__mocks__/asset-svg-stub.tsx",
  import.meta.url,
).pathname;

function getImportText(sourceFile: ts.SourceFile, node: ts.Node) {
  return sourceFile.text.slice(node.getFullStart(), node.getEnd());
}

function getScriptKind(path: string) {
  if (path.endsWith(".tsx")) {
    return ts.ScriptKind.TSX;
  }

  if (path.endsWith(".jsx")) {
    return ts.ScriptKind.JSX;
  }

  if (path.endsWith(".js")) {
    return ts.ScriptKind.JS;
  }

  return ts.ScriptKind.TS;
}

function getTypeOnlyImport(
  moduleSpecifier: string,
  defaultImportName: string | undefined,
  typeOnlyImports: ts.ImportSpecifier[],
) {
  if (!defaultImportName && typeOnlyImports.length === 0) {
    return null;
  }

  const parts: string[] = [];

  if (defaultImportName) {
    parts.push(defaultImportName);
  }

  if (typeOnlyImports.length > 0) {
    parts.push(
      `{ ${typeOnlyImports
        .map((importSpecifier) => {
          const importedName =
            importSpecifier.propertyName?.text ?? importSpecifier.name.text;
          const localName = importSpecifier.name.text;

          if (importedName === localName) {
            return importedName;
          }

          return `${importedName} as ${localName}`;
        })
        .join(", ")} }`,
    );
  }

  return `import type ${parts.join(", ")} from ${moduleSpecifier};`;
}

function getImportStatements(
  importDeclaration: ts.ImportDeclaration,
  index: number,
) {
  const importClause = importDeclaration.importClause;
  const moduleSpecifier = importDeclaration.moduleSpecifier.getText();
  const typeOnlyImports: string[] = [];
  const runtimeImports: string[] = [];

  if (!importClause) {
    if (
      moduleSpecifier === '"@testing-library/jest-dom"' ||
      moduleSpecifier === '"@testing-library/jest-dom/extend-expect"'
    ) {
      return { runtimeImports, typeOnlyImports };
    }

    runtimeImports.push(`await import(${moduleSpecifier});`);
    return { runtimeImports, typeOnlyImports };
  }

  if (importClause.isTypeOnly) {
    typeOnlyImports.push(getImportText(importDeclaration.getSourceFile(), importDeclaration));
    return { runtimeImports, typeOnlyImports };
  }

  if (importClause.namedBindings) {
    if (ts.isNamespaceImport(importClause.namedBindings)) {
      runtimeImports.push(
        `const ${importClause.namedBindings.name.text} = await import(${moduleSpecifier});`,
      );
      return { runtimeImports, typeOnlyImports };
    }
  }

  const typeOnlyImport =
    importClause.namedBindings &&
    ts.isNamedImports(importClause.namedBindings)
    ? getTypeOnlyImport(
        moduleSpecifier,
        undefined,
        importClause.namedBindings.elements.filter(
          (importSpecifier) => importSpecifier.isTypeOnly,
        ),
      )
    : null;

  if (typeOnlyImport) {
    typeOnlyImports.push(typeOnlyImport);
  }

  const runtimeImportSpecifiers =
    importClause.namedBindings &&
    ts.isNamedImports(importClause.namedBindings)
    ? importClause.namedBindings.elements.filter(
        (importSpecifier) => !importSpecifier.isTypeOnly,
      )
    : [];

  if (importClause.name || runtimeImportSpecifiers.length > 0) {
    const moduleBinding = `__web_test_import_${index}__`;
    runtimeImports.push(
      `const ${moduleBinding} = await import(${moduleSpecifier});`,
    );

    if (importClause.name) {
      runtimeImports.push(
        `const ${importClause.name.text} = ${moduleBinding}.default ?? ${moduleBinding};`,
      );
    }

    for (const importSpecifier of runtimeImportSpecifiers) {
      const importedName =
        importSpecifier.propertyName?.text ?? importSpecifier.name.text;
      const localName = importSpecifier.name.text;

      runtimeImports.push(
        `const ${localName} = ${moduleBinding}.${importedName} ?? ${moduleBinding}.default?.${importedName};`,
      );
    }
  }

  return { runtimeImports, typeOnlyImports };
}

function isJestMockStatement(statement: ts.Statement) {
  if (!ts.isExpressionStatement(statement)) {
    return false;
  }

  const expression = statement.expression;

  if (!ts.isCallExpression(expression)) {
    return false;
  }

  if (!ts.isPropertyAccessExpression(expression.expression)) {
    return false;
  }

  return (
    ts.isIdentifier(expression.expression.expression) &&
    expression.expression.expression.text === "jest" &&
    expression.expression.name.text === "mock"
  );
}

function rewriteTestModule(source: string, path: string) {
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(path),
  );
  const output: string[] = [TEST_GLOBALS_IMPORT];
  const preImportStatements: string[] = [];
  const typeOnlyImports: string[] = [];
  const runtimeImports: string[] = [];
  const hoistedJestMocks: string[] = [];
  const otherStatements: string[] = [];
  let importIndex = 0;
  let sawImport = false;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      sawImport = true;
      const importStatements = getImportStatements(statement, importIndex);
      importIndex += 1;
      typeOnlyImports.push(...importStatements.typeOnlyImports);
      runtimeImports.push(...importStatements.runtimeImports);

      continue;
    }

    if (isJestMockStatement(statement)) {
      hoistedJestMocks.push(getImportText(sourceFile, statement));
      continue;
    }

    if (!sawImport) {
      preImportStatements.push(getImportText(sourceFile, statement));
      continue;
    }

    otherStatements.push(getImportText(sourceFile, statement));
  }

  output.push(
    ...typeOnlyImports,
    ...preImportStatements,
    ...hoistedJestMocks,
    ...runtimeImports,
    ...otherStatements,
  );

  return output.join("\n\n");
}

applyBunJestCompat(jest, mock);
globalThis.jest = jest;
globalThis.__webReapplyModuleMocks = mockNodeModules;

const scratchWindow = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/",
}).window;

globalThis.XMLHttpRequest ??= scratchWindow.XMLHttpRequest;

Bun.plugin({
  name: "web-test-bun-runtime",
  setup(build) {
    build.onResolve({ filter: /\.(css|less)$/ }, () => ({
      path: EMPTY_STYLE_STUB_PATH,
    }));

    build.onResolve({ filter: /\.(jpe?g|png|gif)$/i }, () => ({
      path: FILE_STUB_PATH,
    }));

    build.onResolve({ filter: /\.svg$/ }, () => ({
      path: SVG_STUB_PATH,
    }));

    build.onLoad(
      {
        filter: /\/packages\/web\/src\/.*\.(test|spec)\.[jt]sx?$/,
      },
      async (args) => {
        const source = await Bun.file(args.path).text();
        const transpiled = ts.transpileModule(
          rewriteTestModule(source, args.path),
          {
            compilerOptions: {
              jsx: ts.JsxEmit.ReactJSX,
              module: ts.ModuleKind.ESNext,
              target: ts.ScriptTarget.ES2022,
            },
            fileName: args.path,
          },
        );

        return {
          contents: transpiled.outputText,
          loader: "js",
        };
      },
    );

    build.onResolve(
      { filter: /^@testing-library\/jest-dom(?:\/extend-expect)?$/ },
      () => ({
        path: "virtual:web-test-jest-dom",
        namespace: "web-test-bun-runtime",
      }),
    );
    build.onLoad(
      { filter: /.*/, namespace: "web-test-bun-runtime" },
      () => ({
        contents: "export {};",
        loader: "js",
      }),
    );
  },
});

await import("./web.preload");
const { cleanup } = await import("@testing-library/react");
afterEach(() => cleanup());

for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) {
    continue;
  }

  const descriptor = Object.getOwnPropertyDescriptor(window, key);

  if (descriptor) {
    try {
      Object.defineProperty(globalThis, key, descriptor);
    } catch {
      // Some properties are non-configurable in Bun's globalThis; skip them
    }
  }
}

for (const key of [
  "addEventListener",
  "dispatchEvent",
  "Event",
  "CustomEvent",
  "EventTarget",
  "UIEvent",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "InputEvent",
  "PointerEvent",
  "removeEventListener",
  "MutationObserver",
  "XMLHttpRequest",
]) {
  const descriptor = Object.getOwnPropertyDescriptor(window, key);

  if (descriptor) {
    try {
      Object.defineProperty(globalThis, key, descriptor);
    } catch {
      // Some properties are non-configurable in Bun's globalThis; skip them
    }
  }
}

globalThis.addEventListener = window.addEventListener.bind(window);
globalThis.removeEventListener = window.removeEventListener.bind(window);
globalThis.dispatchEvent = window.dispatchEvent.bind(window);
