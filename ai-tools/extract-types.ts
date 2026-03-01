#!/usr/bin/env ts-node
/**
 * Type Extractor
 *
 * Generates comprehensive type documentation from TypeScript files across all packages.
 * Extracts interfaces, types, enums, and Zod schemas to help AI agents understand
 * the type system.
 *
 * Usage: yarn ts-node ai-tools/extract-types.ts
 * Output: ai-tools/type-reference.md
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface TypeInfo {
  name: string;
  kind: "interface" | "type" | "enum" | "schema";
  file: string;
  package: string;
  content: string;
  exports: boolean;
}

/**
 * Extracts type definitions from a TypeScript file
 */
function extractTypesFromFile(filePath: string): TypeInfo[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const types: TypeInfo[] = [];

  const relativePath = filePath.replace(
    path.join(__dirname, "../packages"),
    "",
  );
  const packageMatch = relativePath.match(/^\/(\w+)\//);
  const packageName = packageMatch ? packageMatch[1] : "unknown";

  // Extract interfaces
  const interfacePattern =
    /^export\s+(interface\s+\w+[\s\S]*?)(?=\n(?:export|interface|type|enum|const|function|class|$))/gm;
  let match;

  while ((match = interfacePattern.exec(content)) !== null) {
    const fullMatch = match[1].trim();
    const nameMatch = fullMatch.match(/interface\s+(\w+)/);
    if (nameMatch) {
      types.push({
        name: nameMatch[1],
        kind: "interface",
        file: relativePath,
        package: packageName,
        content: fullMatch,
        exports: true,
      });
    }
  }

  // Extract type aliases
  const typePattern =
    /^export\s+(type\s+\w+\s*=[\s\S]*?)(?=\n(?:export|interface|type|enum|const|function|class|$))/gm;
  while ((match = typePattern.exec(content)) !== null) {
    const fullMatch = match[1].trim();
    const nameMatch = fullMatch.match(/type\s+(\w+)/);
    if (nameMatch) {
      types.push({
        name: nameMatch[1],
        kind: "type",
        file: relativePath,
        package: packageName,
        content: fullMatch,
        exports: true,
      });
    }
  }

  // Extract enums
  const enumPattern = /^export\s+(enum\s+\w+\s*{[\s\S]*?})/gm;
  while ((match = enumPattern.exec(content)) !== null) {
    const fullMatch = match[1].trim();
    const nameMatch = fullMatch.match(/enum\s+(\w+)/);
    if (nameMatch) {
      types.push({
        name: nameMatch[1],
        kind: "enum",
        file: relativePath,
        package: packageName,
        content: fullMatch,
        exports: true,
      });
    }
  }

  // Extract Zod schemas
  const schemaPattern =
    /^export\s+const\s+(\w*Schema\w*)\s*=\s*z\.(object|string|number|array|enum|union|intersection)[\s\S]*?(?=\n(?:export|interface|type|enum|const|function|class|$))/gm;
  while ((match = schemaPattern.exec(content)) !== null) {
    const fullMatch = match[0].trim();
    const nameMatch = fullMatch.match(/const\s+(\w+)/);
    if (nameMatch) {
      types.push({
        name: nameMatch[1],
        kind: "schema",
        file: relativePath,
        package: packageName,
        content: fullMatch,
        exports: true,
      });
    }
  }

  return types;
}

/**
 * Groups types by package
 */
function groupTypesByPackage(types: TypeInfo[]): Map<string, TypeInfo[]> {
  const grouped = new Map<string, TypeInfo[]>();

  types.forEach((type) => {
    if (!grouped.has(type.package)) {
      grouped.set(type.package, []);
    }
    grouped.get(type.package)!.push(type);
  });

  return grouped;
}

/**
 * Generates markdown documentation from type information
 */
function generateMarkdown(typesByPackage: Map<string, TypeInfo[]>): string {
  let markdown = "# Compass Type Reference\n\n";
  markdown += "> Auto-generated type documentation from TypeScript files\n\n";
  markdown += `Generated: ${new Date().toISOString()}\n\n`;

  markdown += "## Overview\n\n";
  markdown +=
    "This document catalogs all exported types, interfaces, enums, and Zod schemas ";
  markdown += "across the Compass monorepo packages.\n\n";

  markdown += "### Packages\n\n";
  typesByPackage.forEach((types, pkg) => {
    markdown += `- **${pkg}**: ${types.length} types\n`;
  });
  markdown += "\n---\n\n";

  // Generate documentation for each package
  typesByPackage.forEach((types, pkg) => {
    markdown += `## Package: @compass/${pkg}\n\n`;

    // Group by kind
    const byKind = new Map<string, TypeInfo[]>();
    types.forEach((type) => {
      if (!byKind.has(type.kind)) {
        byKind.set(type.kind, []);
      }
      byKind.get(type.kind)!.push(type);
    });

    // Document each kind
    ["interface", "type", "enum", "schema"].forEach((kind) => {
      const typesOfKind = byKind.get(kind) || [];
      if (typesOfKind.length === 0) return;

      markdown += `### ${kind.charAt(0).toUpperCase() + kind.slice(1)}s\n\n`;

      typesOfKind
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((type) => {
          markdown += `#### ${type.name}\n\n`;
          markdown += `**File**: \`${type.file}\`\n\n`;
          markdown += "```typescript\n";
          markdown += type.content + "\n";
          markdown += "```\n\n";
        });
    });

    markdown += "---\n\n";
  });

  markdown += "## Usage Guidelines\n\n";
  markdown += "### Importing Types\n\n";
  markdown += "Use module aliases for imports:\n\n";
  markdown += "```typescript\n";
  markdown += "// ✅ Correct\n";
  markdown += "import { User } from '@compass/core';\n";
  markdown += "import { TaskSchema } from '@web/common/types';\n\n";
  markdown += "// ❌ Wrong\n";
  markdown += "import { User } from '../../../core/src/types';\n";
  markdown += "```\n\n";

  markdown += "### Validation with Zod\n\n";
  markdown += "All schemas follow this pattern:\n\n";
  markdown += "```typescript\n";
  markdown += "// 1. Define schema\n";
  markdown += "export const MySchema = z.object({ /* ... */ });\n\n";
  markdown += "// 2. Export inferred type\n";
  markdown += "export type MyType = z.infer<typeof MySchema>;\n\n";
  markdown += "// 3. Use for validation\n";
  markdown += "const validated = MySchema.parse(data);\n";
  markdown += "```\n\n";

  markdown += "### Type Safety\n\n";
  markdown +=
    "- **Always use exported types** - Never inline type definitions\n";
  markdown +=
    "- **Prefer Zod schemas** - For runtime validation and type inference\n";
  markdown +=
    "- **Use strict mode** - All packages use TypeScript strict mode\n";
  markdown += "- **Avoid `any`** - Use `unknown` and type guards instead\n\n";

  return markdown;
}

/**
 * Main execution function
 */
async function extractTypes() {
  console.log("🔍 Scanning for TypeScript files...\n");

  const packagesPath = path.join(__dirname, "../packages");
  const allTypes: TypeInfo[] = [];

  // Find all TypeScript files (excluding test files and node_modules)
  const findCommand = `find ${packagesPath} -name "*.ts" -type f ! -path "*/node_modules/*" ! -path "*/__tests__/*" ! -name "*.test.ts" ! -name "*.spec.ts"`;
  const files = execSync(findCommand, { encoding: "utf-8" })
    .split("\n")
    .filter((f) => f.trim());

  console.log(`Found ${files.length} TypeScript files\n`);
  console.log("📝 Extracting type definitions...\n");

  let processedFiles = 0;
  files.forEach((file) => {
    try {
      const types = extractTypesFromFile(file);
      allTypes.push(...types);
      if (types.length > 0) {
        processedFiles++;
      }
    } catch (error) {
      console.warn(`⚠️  Skipping ${file}: ${error}`);
    }
  });

  console.log(
    `✅ Extracted ${allTypes.length} types from ${processedFiles} files\n`,
  );

  const typesByPackage = groupTypesByPackage(allTypes);
  const markdown = generateMarkdown(typesByPackage);

  const outputPath = path.join(__dirname, "type-reference.md");
  fs.writeFileSync(outputPath, markdown);

  console.log(`📄 Type reference generated successfully!`);
  console.log(`📁 Output: ${outputPath}\n`);

  // Print summary
  console.log("📊 Summary by package:");
  typesByPackage.forEach((types, pkg) => {
    console.log(`   - @compass/${pkg}: ${types.length} types`);
  });
  console.log("");
}

// Execute if run directly
if (require.main === module) {
  extractTypes().catch((error) => {
    console.error("❌ Error extracting types:", error);
    process.exit(1);
  });
}

export { extractTypes };
