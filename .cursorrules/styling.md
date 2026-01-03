---
description: Frontend styling standards - use Tailwind semantic tokens (bg-bg-primary) not raw colors, module aliased imports
globs:
  - "packages/web/**/*.{ts,tsx,css}"
  - "packages/web/src/**/*.{ts,tsx,css}"
---

# Styling and Component Standards

This rule defines styling conventions for frontend components in `packages/web`.

## Tailwind CSS

Use Tailwind CSS for all styling.

## Semantic Color Tokens

Use semantic color tokens defined in `packages/web/src/index.css` with the `@theme` directive.

**DO:**

- ✅ `bg-bg-primary` - Primary background color
- ✅ `text-text-light` - Light text color
- ✅ `border-border-primary` - Primary border color
- ✅ `text-text-lighter`, `bg-bg-secondary`

**DON'T:**

- ❌ `bg-blue-300` - Never use raw Tailwind colors
- ❌ `text-gray-100` - Never use raw Tailwind colors
- ❌ `border-red-500` - Never use raw Tailwind colors

**Rationale:** Semantic tokens enable consistent theming and make it easier to update colors across the application.

## Available Semantic Tokens

Semantic tokens are defined in `packages/web/src/index.css` under `@theme` and are used with Tailwind v4's automatic mapping.

The pattern is: CSS variable `--color-{category}-{name}` → Tailwind class `{category}-{category}-{name}`

**Examples from `packages/web/src/index.css`:**

- **Background:** `bg-bg-primary`, `bg-bg-secondary`
- **Border:** `border-border-primary`, `border-border-primary-dark`, `border-border-secondary`
- **Foreground:** `bg-fg-primary`, `bg-fg-primary-dark`
- **Text:** `text-text-light`, `text-text-lighter`, `text-text-light-inactive`, `text-text-dark`, `text-text-dark-placeholder`
- **Status:** `bg-status-success`, `bg-status-error`, `bg-status-warning`, `bg-status-info`
- **Accent:** `bg-accent-primary`, `text-accent-primary`
- **Tags:** `bg-tag-one`, `bg-tag-two`, `bg-tag-three`
- **Panel:** `bg-panel-bg`, `text-panel-text`
- **Grid:** `border-grid-line-primary`

## Component Best Practices

### React Components (packages/web)

- Follow React best practices and idiomatic patterns
- Use functional components with hooks
- Keep components focused and single-purpose
- Use TypeScript for type safety

### Styling Approach

- Use Tailwind utility classes directly in JSX
- For complex styles, use styled-components (already configured)
- Follow existing patterns in `packages/web/src/components/`

## Module Imports

Always use module aliased paths for imports when importing Compass modules.

**Examples:**

- ✅ `import { Component } from '@web/components'`
- ✅ `import { util } from '@web/common/utils'`
- ✅ `import { types } from '@core/types'`

**Import order (enforced by Prettier):**

1. Third-party modules
2. Non-Compass internal modules
3. `@core/*` modules
4. `@web/*` modules
5. `@backend/*` modules
6. Relative imports

## Real Examples

```tsx
// Good example with semantic colors
<div className="bg-bg-primary text-text-light border border-border-primary">
  <button className="bg-bg-secondary hover:bg-fg-primary hover:text-text-dark">
    Click me
  </button>
</div>

// Bad example with raw colors
<div className="bg-blue-100 text-gray-900 border border-gray-300">
  <button className="bg-blue-500 hover:bg-blue-600">
    Click me
  </button>
</div>
```

## Summary

- Use Tailwind CSS for all styling
- Use semantic color tokens (e.g., `bg-bg-primary`)
- Never use raw Tailwind colors (e.g., `bg-blue-300`)
- Use module aliased imports (`@web/*`, `@core/*`)
- Follow import order enforced by Prettier
