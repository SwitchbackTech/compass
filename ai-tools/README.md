# AI Tools for Compass Development

This directory contains tools and scripts specifically designed to help AI coding agents work effectively with the Compass codebase.

## Available Tools

### 1. API Documentation Generator

**File**: `generate-api-docs.ts`

Automatically extracts and documents all backend API endpoints from route configuration files.

```bash
yarn ts-node ai-tools/generate-api-docs.ts
```

**Output**: `ai-tools/api-documentation.md` - Complete API reference with routes, methods, auth requirements, and controllers.

### 2. Type Extractor

**File**: `extract-types.ts`

Generates comprehensive type documentation from TypeScript files, including interfaces, types, and Zod schemas.

```bash
yarn ts-node ai-tools/extract-types.ts
```

**Output**: `ai-tools/type-reference.md` - All types organized by package with descriptions and usage examples.

### 3. Code Health Auditor

**File**: `code-health-audit.ts`

Analyzes codebase for common issues, complexity metrics, and improvement opportunities.

```bash
yarn ts-node ai-tools/code-health-audit.ts
```

**Output**: Console report with:

- Cyclomatic complexity analysis
- Dead code detection
- Import usage patterns
- Test coverage gaps
- Type safety metrics

### 4. Semantic Code Indexer

**File**: `semantic-index.ts`

Builds a searchable index of the codebase for faster navigation and understanding.

```bash
yarn ts-node ai-tools/semantic-index.ts
```

**Output**: `ai-tools/code-index.json` - Searchable index of functions, classes, and modules with metadata.

### 5. Test Harness Template

**File**: `test-harness.ts`

Template for creating automated test workflows using Harness-style engineering patterns.

```bash
yarn ts-node ai-tools/test-harness.ts
```

**Use**: Copy and modify for specific automation workflows.

### 6. Workflow Examples

**File**: `workflow-examples.md`

Real examples demonstrating Harness and Loop-style development workflows.

## Quick Commands

These commands are available from the root package.json:

```bash
# Run all AI tools and generate documentation
yarn ai:index

# Generate API documentation only
yarn docs:generate

# Run code health audit
yarn audit:code-health

# Type check entire codebase
yarn type-check
```

## Adding New Tools

When adding a new tool to this directory:

1. Create a TypeScript file with clear documentation
2. Add usage instructions to this README
3. Export a main function for command-line usage
4. Add a script to root `package.json` if frequently used
5. Include example output or screenshots

## Best Practices

- **Keep tools simple**: Each tool should do one thing well
- **Document outputs**: Clearly describe what each tool produces
- **Make it fast**: AI agents benefit from quick feedback
- **Use TypeScript**: Leverage type safety in tools
- **Test your tools**: Ensure they work on the actual codebase

## Tool Development

Tools are written in TypeScript and can import from Compass packages:

```typescript
import fs from "fs";
import path from "path";
import { z } from "zod";
// Use module aliases
import { SomeType } from "@compass/core";

// Your tool logic here
export async function myTool() {
  // Implementation
}

// CLI execution
if (require.main === module) {
  myTool().catch(console.error);
}
```

## Contributing

Have an idea for a new AI tool?

1. Create the tool in this directory
2. Update this README
3. Add tests if applicable
4. Submit a PR with examples of usage
