# Git Conventions

This rule defines branch naming and commit message standards for the Compass codebase.

## Branch Naming

Follow the pattern: `type/action-description`

### Branch Types

- `feature/` - New features or enhancements
- `bug/` - Bug fixes
- `hotfix/` - Critical production fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

### Examples

- ✅ `feature/add-calendar-sync`
- ✅ `bug/fix-auth-timeout`
- ✅ `docs/update-readme`
- ✅ `refactor/simplify-event-logic`

## Commit Messages

Use conventional commit format: `type(scope): description`

### Commit Types

- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Scopes

- `web` - Frontend/React changes
- `backend` - Server/API changes
- `core` - Shared utilities/types
- `scripts` - CLI tools
- `config` - Configuration files

### Message Rules

- Use present tense: "add feature" not "added feature"
- Use lowercase
- Keep under 72 characters
- Be specific and descriptive

### Examples

- ✅ `feat(web): add calendar event creation modal`
- ✅ `fix(backend): resolve authentication timeout issue`
- ✅ `docs(readme): update installation instructions`
- ✅ `refactor(core): simplify date utility functions`
- ✅ `test(web): add unit tests for login component`
- ✅ `chore(deps): update react to v18.3.0`

## Pre-commit Validation

The repository includes Husky hooks that will:

- Run `yarn lint-staged` on pre-commit (formats code with Prettier)
- Run `yarn prettier . --write` on pre-push (ensures consistent formatting)

**ALWAYS ensure your commits pass these checks before pushing.**

## Summary

- Branch: `type/action-description` (e.g., `feature/add-sync`)
- Commit: `type(scope): description` (e.g., `feat(web): add modal`)
- Use present tense, lowercase
- Keep messages under 72 characters
- Pre-commit hooks format code automatically
