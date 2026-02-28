#!/usr/bin/env ts-node
/**
 * API Documentation Generator
 *
 * Automatically extracts and documents all backend API endpoints from route configuration files.
 * This tool scans the backend package for *routes.config.ts files and generates comprehensive
 * API documentation.
 *
 * Usage: yarn ts-node ai-tools/generate-api-docs.ts
 * Output: ai-tools/api-documentation.md
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface RouteFile {
  file: string;
  name: string;
  content: string;
}

/**
 * Generates markdown documentation from route files
 */
function generateMarkdown(routeFiles: RouteFile[]): string {
  let markdown = "# Compass API Documentation\n\n";
  markdown +=
    "> Auto-generated API documentation from route configuration files\n\n";
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += "## Table of Contents\n\n";

  // Generate table of contents
  routeFiles.forEach((rf) => {
    markdown += `- [${rf.name} Routes](#${rf.name.toLowerCase().replace(/\s+/g, "-")}-routes)\n`;
  });
  markdown += "\n---\n\n";

  // Generate detailed documentation for each route file
  routeFiles.forEach((routeFile) => {
    markdown += `## ${routeFile.name} Routes\n\n`;
    markdown += `**Source**: \`packages/backend/src/${routeFile.name.toLowerCase()}/${routeFile.file}\`\n\n`;

    // Extract routes from the file content
    const routes = extractRoutesFromContent(routeFile.content);

    if (routes.length === 0) {
      markdown += "*Review the source file for route definitions*\n\n";
    } else {
      routes.forEach((route) => {
        markdown += `### ${route}\n\n`;
      });
    }

    markdown += "---\n\n";
  });

  // Add authentication section
  markdown += "## Authentication\n\n";
  markdown +=
    "Most endpoints require authentication via Supertokens session management.\n\n";
  markdown += "**Authentication Flow**:\n";
  markdown += "1. Client initiates OAuth flow via `/api/auth`\n";
  markdown += "2. User authenticates with Google\n";
  markdown += "3. Session cookie is set\n";
  markdown += "4. Subsequent requests include session cookie\n";
  markdown +=
    "5. Backend validates session with `verifySession()` middleware\n\n";

  markdown += "## Common Patterns\n\n";
  markdown += "### Route Configuration\n\n";
  markdown +=
    "Routes are defined in `*routes.config.ts` files using Express router:\n\n";
  markdown += "```typescript\n";
  markdown += "this.app\n";
  markdown += "  .route(`/api/endpoint`)\n";
  markdown += "  .all(verifySession())  // Authentication middleware\n";
  markdown += "  .get(controller.method)\n";
  markdown += "  .post(controller.create)\n";
  markdown += "  .put(controller.update)\n";
  markdown += "  .delete(controller.delete);\n";
  markdown += "```\n\n";

  markdown += "### Middleware\n\n";
  markdown += "- `verifySession()` - Requires valid Supertokens session\n";
  markdown +=
    "- `requireGoogleConnectionSession` - Requires Google OAuth connection\n";
  markdown += "- `verifyIsDev` - Development environment only\n\n";

  markdown += "## Error Responses\n\n";
  markdown += "Standard error response format:\n\n";
  markdown += "```json\n";
  markdown += "{\n";
  markdown += '  "error": "Error message",\n';
  markdown += '  "statusCode": 400,\n';
  markdown += '  "details": "Additional context (optional)"\n';
  markdown += "}\n";
  markdown += "```\n\n";

  markdown += "## Key Endpoints\n\n";
  markdown += "- `/api/auth/*` - Authentication and OAuth flows\n";
  markdown += "- `/api/user/*` - User profile and metadata\n";
  markdown += "- `/api/event/*` - Calendar event CRUD operations\n";
  markdown += "- `/api/calendars/*` - Calendar list and selection\n";
  markdown += "- `/api/sync/*` - Google Calendar synchronization\n";
  markdown += "- `/api/priority/*` - Task priority management\n";
  markdown += "- `/api/waitlist/*` - Waitlist management\n\n";

  return markdown;
}

/**
 * Extracts route paths from file content
 */
function extractRoutesFromContent(content: string): string[] {
  const routes: string[] = [];

  // Find all .route() calls
  const routeRegex = /\.route\([`'"]([^`'"]+)[`'"]\)/g;
  let match;

  while ((match = routeRegex.exec(content)) !== null) {
    if (match[1]) {
      routes.push(match[1]);
    }
  }

  return routes;
}

/**
 * Main execution function
 */
async function generateApiDocs() {
  console.log("🔍 Scanning for route configuration files...\n");

  const backendPath = path.join(__dirname, "../packages/backend/src");
  const routeFiles: RouteFile[] = [];

  // Find all route config files
  const findCommand = `find ${backendPath} -name "*.routes.config.ts" -type f`;
  const files = execSync(findCommand, { encoding: "utf-8" })
    .split("\n")
    .filter((f) => f.trim());

  console.log(`Found ${files.length} route configuration files:\n`);

  files.forEach((file) => {
    const fileName = path.basename(file);
    const content = fs.readFileSync(file, "utf-8");
    const routeName = fileName.replace(".routes.config.ts", "");
    const displayName = routeName.charAt(0).toUpperCase() + routeName.slice(1);

    console.log(`  - ${fileName}`);
    routeFiles.push({
      file: fileName,
      name: displayName,
      content,
    });
  });

  console.log("\n📝 Generating API documentation...\n");

  const markdown = generateMarkdown(routeFiles);
  const outputPath = path.join(__dirname, "api-documentation.md");
  fs.writeFileSync(outputPath, markdown);

  console.log(`✅ API documentation generated successfully!`);
  console.log(`📄 Output: ${outputPath}\n`);

  // Print summary
  console.log(`📊 Summary:`);
  console.log(`   - ${files.length} route configuration files documented\n`);
}

// Execute if run directly
if (require.main === module) {
  generateApiDocs().catch((error) => {
    console.error("❌ Error generating API documentation:", error);
    process.exit(1);
  });
}

export { generateApiDocs };
