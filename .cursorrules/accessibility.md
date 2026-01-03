---
description: Accessibility standards - semantic HTML, keyboard navigation, ARIA labels, refer to .claude/skills/a11y-audit/SKILL.md or .codex/skills/a11y-audit/SKILL.md for comprehensive checklist
globs:
  - "packages/web/**/*.{ts,tsx}"
---

# Accessibility Standards

This rule defines accessibility requirements for the Compass codebase, especially for `packages/web`.

## Overview

Follow accessibility best practices to ensure the application is usable by everyone, including users with disabilities.

## Key Principles

1. Use semantic HTML elements
2. Provide keyboard navigation support
3. Include proper ARIA labels and attributes
4. Ensure sufficient color contrast
5. Test with screen readers when possible

## Detailed Guidelines

Refer to the comprehensive accessibility audit checklist in:
**`.claude/skills/a11y-audit/SKILL.md`** or **`.codex/skills/a11y-audit/SKILL.md`**

This skill provides:

- Diff-first accessibility checklist
- Semantic and structure requirements
- Keyboard and focus management
- ARIA correctness guidelines
- Visual and motion considerations
- Testing reliability patterns

## Core Requirements

### Semantic HTML

Use appropriate HTML elements for their intended purpose.

**DO:**

- ✅ Use `<button>` for clickable actions
- ✅ Use `<a>` for navigation links
- ✅ Use `<h1>` through `<h6>` for headings
- ✅ Use `<nav>`, `<main>`, `<header>`, `<footer>` for landmarks

**DON'T:**

- ❌ Use `<div>` with click handlers instead of `<button>`
- ❌ Use `<span>` for interactive elements
- ❌ Skip heading levels

### Labels and Names

All interactive elements must have accessible names.

**Examples:**

```tsx
// Good - Input with label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Good - Icon button with aria-label
<button aria-label="Add event">
  <PlusIcon />
</button>

// Bad - Input without label
<input type="email" />

// Bad - Icon button without accessible name
<button>
  <PlusIcon />
</button>
```

### Keyboard Navigation

All interactive elements must be keyboard accessible.

**Requirements:**

- All buttons and links are reachable via Tab
- Custom interactive elements have `tabIndex={0}`
- Dialogs trap focus and return focus on close
- Avoid `tabIndex > 0` (breaks natural tab order)

### ARIA Attributes

Use ARIA attributes when native semantics are insufficient.

**Common patterns:**

```tsx
// Disclosure/Accordion
<button aria-expanded={isOpen} aria-controls="panel-id">
  Toggle
</button>
<div id="panel-id" hidden={!isOpen}>Content</div>

// Dialog
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Dialog Title</h2>
  {/* content */}
</div>
```

## Testing for Accessibility

### Use Semantic Queries in Tests

When writing tests in `packages/web`, use accessible queries:

```typescript
// Good - finds elements the way assistive tech does
const button = getByRole('button', { name: /add event/i });
const heading = getByRole('heading', { level: 2 });
const textbox = getByLabelText('Email');

// Bad - relies on implementation details
const button = getByTestId('add-button');
const heading = container.querySelector('.heading');
```

This aligns with the testing standards in `testing.md`.

## Audit Checklist Reference

For comprehensive review of UI changes, refer to:
**`.claude/skills/a11y-audit/SKILL.md`** or **`.codex/skills/a11y-audit/SKILL.md`**

Key sections:

- Semantics and structure
- Labels and names
- Keyboard and focus
- ARIA correctness
- Visual and motion
- Testing reliability

## Real Examples from Codebase

Review these for accessibility patterns:

- `packages/web/src/components/Button/`
- `packages/web/src/components/Input/`
- `packages/web/src/components/Modal/`

## Summary

- Use semantic HTML (`<button>`, `<a>`, headings, landmarks)
- Provide accessible names (labels, `aria-label`)
- Support keyboard navigation (Tab, Enter, Space)
- Use ARIA when needed (`aria-expanded`, `aria-label`, `role`)
- Test with semantic queries (`getByRole`, `getByLabelText`)
- Refer to `.claude/skills/a11y-audit/SKILL.md` or `.codex/skills/a11y-audit/SKILL.md` for detailed guidance
