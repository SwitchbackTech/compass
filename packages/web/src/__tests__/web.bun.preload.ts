import { JSDOM } from "jsdom";
import { expect, jest, mock } from "bun:test";
import { createRequire } from "node:module";
import ts from "typescript";

type MatcherContext = {
  isNot?: boolean;
  promise?: string;
  utils?: Record<string, unknown>;
};

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
  'import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest, mock, spyOn, test } from "@web/__tests__/bun-test-shim";\nimport { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);';

function getClassNames(expectedClassNames: string[]) {
  return expectedClassNames
    .flatMap((expectedClassName) => expectedClassName.split(/\s+/))
    .filter(Boolean);
}

function getStyleEntries(expectedStyle: Record<string, string> | string) {
  if (typeof expectedStyle === "string") {
    return expectedStyle
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [property, ...value] = part.split(":");

        return [property?.trim() ?? "", value.join(":").trim()];
      })
      .filter(([property]) => property);
  }

  return Object.entries(expectedStyle).map(([property, value]) => {
    const cssProperty = property.replace(/[A-Z]/g, (letter) => {
      return `-${letter.toLowerCase()}`;
    });

    return [cssProperty, String(value)];
  });
}

function getTagName(received: unknown) {
  if (
    received &&
    typeof received === "object" &&
    "tagName" in received &&
    typeof received.tagName === "string"
  ) {
    return received.tagName.toLowerCase();
  }

  return "node";
}

function isElement(received: unknown): received is Element {
  return received instanceof Element;
}

function makeMessage(message: string) {
  return () => message;
}

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

    runtimeImports.push(`require(${moduleSpecifier});`);
    return { runtimeImports, typeOnlyImports };
  }

  if (importClause.isTypeOnly) {
    typeOnlyImports.push(getImportText(importDeclaration.getSourceFile(), importDeclaration));
    return { runtimeImports, typeOnlyImports };
  }

  if (importClause.namedBindings) {
    if (ts.isNamespaceImport(importClause.namedBindings)) {
      runtimeImports.push(
        `const ${importClause.namedBindings.name.text} = require(${moduleSpecifier});`,
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
    runtimeImports.push(`const ${moduleBinding} = require(${moduleSpecifier});`);

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
  const typeOnlyImports: string[] = [];
  const runtimeImports: string[] = [];
  const hoistedJestMocks: string[] = [];
  const otherStatements: string[] = [];
  let importIndex = 0;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
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

    otherStatements.push(getImportText(sourceFile, statement));
  }

  output.push(
    ...typeOnlyImports,
    ...hoistedJestMocks,
    ...runtimeImports,
    ...otherStatements,
  );

  return output.join("\n\n");
}

applyBunJestCompat(jest, mock);
globalThis.jest = jest;

const scratchWindow = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/",
}).window;

globalThis.XMLHttpRequest ??= scratchWindow.XMLHttpRequest;

Bun.plugin({
  name: "web-test-bun-runtime",
  setup(build) {
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

for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) {
    continue;
  }

  const descriptor = Object.getOwnPropertyDescriptor(window, key);

  if (descriptor) {
    Object.defineProperty(globalThis, key, descriptor);
  }
}

for (const key of ["MouseEvent", "MutationObserver", "XMLHttpRequest"]) {
  const descriptor = Object.getOwnPropertyDescriptor(window, key);

  if (descriptor) {
    Object.defineProperty(globalThis, key, descriptor);
  }
}

expect.extend(
  Object.fromEntries(
    Object.entries(jestDomMatchers).map(([name, matcher]) => {
      return [
        name,
        function wrappedMatcher(this: MatcherContext, ...args: unknown[]) {
          const baseContext =
            this && typeof this === "object" ? this : ({} as MatcherContext);
          const baseUtils =
            this.utils && typeof this.utils === "object" ? this.utils : {};
          const utils = Object.assign(
            Object.create(Object.getPrototypeOf(baseUtils)),
            baseUtils,
            {
              DIM_COLOR:
                this.utils?.["DIM_COLOR"] ??
                jestMatcherUtils["DIM_COLOR"] ??
                ((value: unknown) => String(value)),
              EXPECTED_COLOR:
                this.utils?.["EXPECTED_COLOR"] ??
                jestMatcherUtils["EXPECTED_COLOR"] ??
                ((value: unknown) => String(value)),
              RECEIVED_COLOR:
                this.utils?.["RECEIVED_COLOR"] ??
                jestMatcherUtils["RECEIVED_COLOR"] ??
                ((value: unknown) => String(value)),
              diff:
                this.utils?.["diff"] ?? jestMatcherUtils["diff"] ?? (() => ""),
              matcherHint:
                this.utils?.["matcherHint"] ??
                jestMatcherUtils["matcherHint"] ??
                ((value: unknown) => String(value)),
              printExpected:
                this.utils?.["printExpected"] ??
                jestMatcherUtils["printExpected"] ??
                ((value: unknown) => String(value)),
              printReceived:
                this.utils?.["printReceived"] ??
                jestMatcherUtils["printReceived"] ??
                ((value: unknown) => String(value)),
              printWithType:
                this.utils?.["printWithType"] ??
                jestMatcherUtils["printWithType"] ??
                ((value: unknown) => String(value)),
            },
          );
          const context = Object.create(baseContext);
          Object.defineProperty(context, "equals", {
            configurable: true,
            enumerable: true,
            value:
              (this as MatcherContext & { equals?: (a: unknown, b: unknown) => boolean })
                .equals ??
              ((left: unknown, right: unknown) => {
                return (
                  Object.is(left, right) ||
                  JSON.stringify(left) === JSON.stringify(right)
                );
              }),
            writable: true,
          });
          Object.defineProperty(context, "utils", {
            configurable: true,
            enumerable: true,
            value: utils,
            writable: true,
          });

          return matcher.call(context, ...args);
        },
      ];
    }),
  ),
);
