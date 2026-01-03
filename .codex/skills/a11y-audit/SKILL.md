---
name: codex-a11y-audit
description: Use when reviewing UI diffs, accessibility audits, or flaky UI tests to catch a11y regressions, semantic issues, keyboard/focus problems, and to recommend minimal fixes plus role-based test selectors.
version: 1.0.0
tags:
  - accessibility
  - ui
  - testing
---

# Accessibility Change Audit

Brief purpose: review UI changes for accessibility regressions and missing improvements, then propose minimal fixes tied to the diff.

## Overview

This skill audits UI diffs for semantics, keyboard access, focus management, ARIA correctness, contrast, and testability. It is diff-first: only evaluate changed lines and their immediate context.

## Prerequisites

- A diff, PR, or change list that includes relevant UI files.
- Optional: a screenshot or description of the changed UI state.

## Instructions

### Step 1: Scope the audit to the diff

Identify changed UI elements, interactions, and styles. Ignore unrelated files.

### Step 2: Run the diff-first checklist

Focus on changes that alter semantics, interaction, or visual affordances.

### Step 3: Produce findings and minimal fixes

Tie each issue to a specific change and propose the smallest reasonable fix.

### Step 4: Improve test reliability

Recommend role- and name-based queries for tests instead of data or class selectors.

## Audit Checklist (Diff-First)

Semantics and structure

- Headings follow order and are not skipped.
- Interactive elements are buttons/links, not divs/spans.
- Landmarks are present for new regions (main, nav, header, footer, aside).
- Lists and tables use correct elements (ul/ol/li, th/thead/tbody).

Labels and names

- Inputs have labels or aria-label/aria-labelledby.
- Icon-only controls have accessible names.
- Helper text ties to inputs via aria-describedby.

Keyboard and focus

- All interactive elements are keyboard reachable and operable.
- Focus order follows DOM order (avoid tabIndex > 0).
- Dialogs/menus trap focus and return focus to trigger.

ARIA correctness

- ARIA only when native semantics are insufficient.
- aria-expanded/controls/pressed reflect actual state.
- role is correct and not redundant.

Visual and motion

- Text and focus indicators meet contrast requirements.
- Color is not the only indicator.
- Motion respects reduced-motion preferences.

Media and imagery

- Images have meaningful alt or empty alt for decorative.
- Media controls are accessible and labeled.

Testing reliability

- New elements can be found by role and accessible name.
- Interaction tests use user flows and semantic queries.

## Minimal Fix Patterns

1. Icon-only button

- Add visible text or aria-label.

2. Clickable non-button

- Convert to <button> or add role="button", tabIndex=0, and Enter/Space handling.

3. Form label

- Add <label htmlFor> or aria-labelledby and connect helper text with aria-describedby.

4. Disclosure

- Toggle uses aria-expanded and aria-controls; update on state change.

5. Dialog

- Use role="dialog", aria-modal, label by heading, and return focus on close.

## Output Format

Findings (ordered by severity):

- [severity] path:line - problem and impact
  Fix: minimal change suggestion

Tests:

- Recommend updates that use role/name queries and user-driven events.

UX/Speed Note:

- Call out any change that impacts perceived speed (layout shifts, heavy DOM, over-rendering).

Severity scale: blocker, high, medium, low.

## Example Review Output

Findings:

- high `packages/web/src/views/Example.tsx:42` - Clickable div lacks keyboard support; keyboard users cannot activate it.
  Fix: convert to <button type="button"> or add role, tabIndex, and Enter/Space handlers.
- medium `packages/web/src/views/Example.tsx:60` - Icon-only control has no accessible name.
  Fix: add aria-label="Add event".

Tests:

- Add a role-based query: getByRole("button", { name: /add event/i }).

UX/Speed Note:

- No layout shift detected; DOM complexity unchanged.
