#!/usr/bin/env ts-node
/**
 * Code Health Auditor
 *
 * Analyzes the codebase for common issues, complexity metrics, and improvement opportunities.
 * Helps AI agents understand code quality and identify areas for improvement.
 *
 * Usage: yarn ts-node ai-tools/code-health-audit.ts
 * Output: Console report with actionable insights
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface FileMetrics {
  file: string;
  lines: number;
  functions: number;
  complexity: number;
  imports: number;
  exports: number;
  hasTests: boolean;
  issues: string[];
}

interface AuditReport {
  totalFiles: number;
  totalLines: number;
  averageComplexity: number;
  filesWithoutTests: string[];
  largeFiles: string[];
  complexFunctions: Array<{ file: string; issue: string }>;
  importIssues: Array<{ file: string; issue: string }>;
  generalIssues: Array<{ file: string; issue: string }>;
}

/**
 * Analyzes a single file for metrics and issues
 */
function analyzeFile(filePath: string): FileMetrics {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").length;
  const issues: string[] = [];

  // Count functions
  const functionMatches = content.match(
    /function\s+\w+|const\s+\w+\s*=\s*\(.*?\)\s*=>|async\s+function/g,
  );
  const functions = functionMatches ? functionMatches.length : 0;

  // Estimate complexity (simple heuristic based on control flow keywords)
  const complexityKeywords = [
    "if",
    "else",
    "for",
    "while",
    "switch",
    "case",
    "&&",
    "||",
    "?",
  ];
  let complexity = 1; // Base complexity
  complexityKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    const matches = content.match(regex);
    if (matches) {
      complexity += matches.length;
    }
  });

  // Count imports and exports
  const importMatches = content.match(/^import\s+.*?from/gm);
  const imports = importMatches ? importMatches.length : 0;

  const exportMatches = content.match(
    /^export\s+(const|function|class|interface|type|enum)/gm,
  );
  const exports = exportMatches ? exportMatches.length : 0;

  // Check for tests
  const testFile = filePath.replace(/\.tsx?$/, ".test.ts");
  const specFile = filePath.replace(/\.tsx?$/, ".spec.ts");
  const hasTests =
    fs.existsSync(testFile) ||
    fs.existsSync(specFile) ||
    filePath.includes("__tests__");

  // Check for relative imports (should use aliases)
  if (content.match(/from\s+['"]\.\./)) {
    issues.push("Uses relative imports (should use module aliases)");
  }

  // Check for any type
  if (content.match(/:\s*any\b/)) {
    issues.push("Contains `any` type (prefer `unknown` with type guards)");
  }

  // Check for console.log (should use logger)
  if (
    content.match(/console\.(log|error|warn)/) &&
    !filePath.includes("logger")
  ) {
    issues.push("Uses console.log (prefer logger utility)");
  }

  // Check for long functions (> 50 lines)
  const functionBodies = content.match(/\{[^{}]*\}/gs);
  if (functionBodies) {
    functionBodies.forEach((body) => {
      const bodyLines = body.split("\n").length;
      if (bodyLines > 50) {
        issues.push(
          `Contains long function (${bodyLines} lines - consider refactoring)`,
        );
      }
    });
  }

  // Check for large files (> 500 lines)
  if (lines > 500) {
    issues.push(`Large file (${lines} lines - consider splitting)`);
  }

  // Check for high complexity
  if (complexity > 20 && functions > 0) {
    const avgComplexity = Math.round(complexity / functions);
    if (avgComplexity > 10) {
      issues.push(`High complexity (avg ${avgComplexity} per function)`);
    }
  }

  return {
    file: filePath,
    lines,
    functions,
    complexity,
    imports,
    exports,
    hasTests,
    issues,
  };
}

/**
 * Generates audit report from file metrics
 */
function generateReport(metrics: FileMetrics[]): AuditReport {
  const totalFiles = metrics.length;
  const totalLines = metrics.reduce((sum, m) => sum + m.lines, 0);
  const totalComplexity = metrics.reduce((sum, m) => sum + m.complexity, 0);
  const averageComplexity = Math.round(totalComplexity / totalFiles);

  const filesWithoutTests = metrics
    .filter(
      (m) =>
        !m.hasTests && !m.file.includes("test") && !m.file.includes("spec"),
    )
    .map((m) => m.file);

  const largeFiles = metrics
    .filter((m) => m.lines > 500)
    .map((m) => `${m.file} (${m.lines} lines)`);

  const complexFunctions: Array<{ file: string; issue: string }> = [];
  const importIssues: Array<{ file: string; issue: string }> = [];
  const generalIssues: Array<{ file: string; issue: string }> = [];

  metrics.forEach((m) => {
    m.issues.forEach((issue) => {
      if (issue.includes("complexity") || issue.includes("long function")) {
        complexFunctions.push({ file: m.file, issue });
      } else if (issue.includes("import")) {
        importIssues.push({ file: m.file, issue });
      } else {
        generalIssues.push({ file: m.file, issue });
      }
    });
  });

  return {
    totalFiles,
    totalLines,
    averageComplexity,
    filesWithoutTests,
    largeFiles,
    complexFunctions,
    importIssues,
    generalIssues,
  };
}

/**
 * Prints formatted audit report to console
 */
function printReport(report: AuditReport) {
  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║       COMPASS CODE HEALTH AUDIT REPORT           ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  console.log("📊 OVERVIEW\n");
  console.log(`   Total Files Analyzed: ${report.totalFiles}`);
  console.log(`   Total Lines of Code:  ${report.totalLines.toLocaleString()}`);
  console.log(`   Average Complexity:   ${report.averageComplexity}`);
  console.log("");

  // Test Coverage
  console.log("🧪 TEST COVERAGE\n");
  if (report.filesWithoutTests.length === 0) {
    console.log("   ✅ All source files have associated tests!\n");
  } else {
    console.log(
      `   ⚠️  ${report.filesWithoutTests.length} files without tests:\n`,
    );
    report.filesWithoutTests.slice(0, 10).forEach((file) => {
      console.log(`      - ${file.replace(/.*packages/, "packages")}`);
    });
    if (report.filesWithoutTests.length > 10) {
      console.log(
        `      ... and ${report.filesWithoutTests.length - 10} more\n`,
      );
    } else {
      console.log("");
    }
  }

  // Large Files
  console.log("📏 FILE SIZE\n");
  if (report.largeFiles.length === 0) {
    console.log("   ✅ No files exceed 500 lines!\n");
  } else {
    console.log(
      `   ⚠️  ${report.largeFiles.length} large files (>500 lines):\n`,
    );
    report.largeFiles.slice(0, 5).forEach((file) => {
      console.log(`      - ${file.replace(/.*packages/, "packages")}`);
    });
    if (report.largeFiles.length > 5) {
      console.log(`      ... and ${report.largeFiles.length - 5} more\n`);
    } else {
      console.log("");
    }
  }

  // Complexity Issues
  console.log("🔍 COMPLEXITY\n");
  if (report.complexFunctions.length === 0) {
    console.log("   ✅ No excessive complexity detected!\n");
  } else {
    console.log(
      `   ⚠️  ${report.complexFunctions.length} complexity issues:\n`,
    );
    report.complexFunctions.slice(0, 5).forEach(({ file, issue }) => {
      console.log(`      - ${file.replace(/.*packages/, "packages")}`);
      console.log(`        ${issue}\n`);
    });
    if (report.complexFunctions.length > 5) {
      console.log(`      ... and ${report.complexFunctions.length - 5} more\n`);
    }
  }

  // Import Issues
  console.log("📦 IMPORTS\n");
  if (report.importIssues.length === 0) {
    console.log("   ✅ All imports use proper module aliases!\n");
  } else {
    console.log(
      `   ⚠️  ${report.importIssues.length} files with relative imports:\n`,
    );
    report.importIssues.slice(0, 5).forEach(({ file }) => {
      console.log(`      - ${file.replace(/.*packages/, "packages")}`);
    });
    if (report.importIssues.length > 5) {
      console.log(`      ... and ${report.importIssues.length - 5} more\n`);
    } else {
      console.log("");
    }
  }

  // General Issues
  console.log("⚙️  OTHER ISSUES\n");
  if (report.generalIssues.length === 0) {
    console.log("   ✅ No other issues found!\n");
  } else {
    console.log(`   Found ${report.generalIssues.length} issues:\n`);

    // Group by issue type
    const byType = new Map<string, number>();
    report.generalIssues.forEach(({ issue }) => {
      byType.set(issue, (byType.get(issue) || 0) + 1);
    });

    byType.forEach((count, issue) => {
      console.log(`      - ${issue}: ${count} occurrences`);
    });
    console.log("");
  }

  // Recommendations
  console.log("💡 RECOMMENDATIONS\n");
  console.log(
    "   1. Use module aliases (@compass/*, @web/*, @core/*) for imports",
  );
  console.log("   2. Add tests for files without test coverage");
  console.log("   3. Refactor large files (>500 lines) into smaller modules");
  console.log(
    "   4. Simplify complex functions (>50 lines or high cyclomatic complexity)",
  );
  console.log(
    "   5. Replace `any` types with `unknown` and proper type guards",
  );
  console.log("   6. Use logger utility instead of console.log\n");

  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║                  END OF REPORT                    ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");
}

/**
 * Main execution function
 */
async function runAudit() {
  console.log("🔍 Starting code health audit...\n");

  const packagesPath = path.join(__dirname, "../packages");

  // Find all TypeScript source files (excluding tests, node_modules, and build artifacts)
  const findCommand = `find ${packagesPath} -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v __tests__ | grep -v ".test." | grep -v ".spec." | grep -v "build/"`;

  let files: string[];
  try {
    files = execSync(findCommand, { encoding: "utf-8" })
      .split("\n")
      .filter((f) => f.trim());
  } catch (error) {
    console.error("Error finding files:", error);
    return;
  }

  console.log(`Found ${files.length} source files to analyze\n`);
  console.log("Analyzing files... (this may take a moment)\n");

  const metrics: FileMetrics[] = [];
  let analyzed = 0;

  files.forEach((file) => {
    try {
      const fileMetrics = analyzeFile(file);
      metrics.push(fileMetrics);
      analyzed++;

      if (analyzed % 50 === 0) {
        process.stdout.write(`\rAnalyzed ${analyzed}/${files.length} files...`);
      }
    } catch (error) {
      // Skip files that can't be analyzed
    }
  });

  console.log(`\rAnalyzed ${analyzed}/${files.length} files... Done!\n`);

  const report = generateReport(metrics);
  printReport(report);
}

// Execute if run directly
if (require.main === module) {
  runAudit().catch((error) => {
    console.error("❌ Error running audit:", error);
    process.exit(1);
  });
}

export { runAudit };
