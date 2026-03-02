# Contribution Guide️ 👷‍♀️👷‍♂️

The Compass Contribution Guide is available on the official doc site:
[https://docs.compasscalendar.com/docs/how-to-contribute/contribute](https://docs.compasscalendar.com/docs/how-to-contribute/contribute)

## For AI Agents

This section provides specific guidelines for AI coding agents working on Compass.

### Getting Started

1. **Read the Documentation First**
   - Start with [AGENTS.md](./AGENTS.md) for complete development instructions
   - Review [README.md](./README.md) for project overview
   - Check existing issues and PRs for context

2. **Environment Setup**

   ```bash
   yarn install --frozen-lockfile --network-timeout 300000
   cp packages/backend/.env.local.example packages/backend/.env
   yarn dev:web  # Verify frontend works
   ```

3. **Understand the Codebase**
   - Use `yarn ai:index` to generate semantic search index
   - Explore `ai-tools/` directory for helpful scripts
   - Review architecture in [AGENTS.md](./AGENTS.md)

### Coding Standards for AI Agents

#### 1. Module Imports

**ALWAYS** use module aliases instead of relative paths:

```typescript
// ✅ Correct
import { foo } from '@compass/core'
import { bar } from '@web/common/utils'
import { baz } from '@core/types'

// ❌ Wrong
import { foo } from '../../../core/src'
import { bar } from '../../common/utils'
```

#### 2. Type Safety and Validation

**ALWAYS** use Zod for validation:

```typescript
import { z } from "zod";

// Define schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
});

// Export type from schema
export type User = z.infer<typeof UserSchema>;

// Use for validation
export const validateUser = (data: unknown): User => UserSchema.parse(data);
```

#### 3. Testing Requirements

Write tests following user behavior patterns:

```typescript
// ✅ Correct - Using semantic queries
const button = screen.getByRole('button', { name: /save/i });
await user.click(button);

// ❌ Wrong - Using implementation details
const button = container.querySelector('.save-button');
button.click();
```

#### 4. API Route Documentation

Document all backend routes with JSDoc:

```typescript
/**
 * Get user profile information
 * @route GET /api/user/profile
 * @auth Required - Supertokens session
 * @returns {UserProfile} User profile data
 * @throws {401} Unauthorized - Invalid or missing session
 * @throws {404} Not Found - User not found
 */
.get(userController.getProfile);
```

#### 5. Error Handling

Always include proper error handling:

```typescript
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new ApiError('User-friendly message', 500);
}
```

### Git Workflow for AI Agents

#### Branch Naming

Follow semantic branch naming:

```bash
# Format: type/action[-issue-number]
feature/add-calendar-sync
bug/fix-auth-timeout
docs/update-api-docs
refactor/simplify-event-handler
```

#### Commit Messages

Use conventional commit format:

```bash
# Format: type(scope): description
feat(web): add calendar event creation modal
fix(backend): resolve authentication timeout issue
docs(readme): update installation instructions
refactor(core): simplify date utility functions
test(web): add unit tests for login component
```

**Commit Types:**

- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks, dependency updates

**Scope Examples:**

- `web` - Frontend/React changes
- `backend` - Server/API changes
- `core` - Shared utilities/types
- `scripts` - CLI tools and build scripts
- `config` - Configuration files

### Code Review Process

#### Before Submitting PR

1. **Run Type Checking**

   ```bash
   yarn type-check
   ```

2. **Run Tests**

   ```bash
   yarn test:core
   yarn test:web
   yarn test:backend
   ```

3. **Check Code Health**

   ```bash
   yarn audit:code-health
   ```

4. **Format Code**

   ```bash
   yarn prettier . --write
   ```

5. **Generate Documentation** (if you added/modified APIs)
   ```bash
   yarn docs:generate
   ```

#### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing

- [ ] Unit tests pass (`yarn test:core`, `yarn test:web`, `yarn test:backend`)
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests added/updated as needed
```

### Common Pitfalls to Avoid

1. **Don't use barrel files (`index.ts`)** - Use named exports directly
2. **Don't use raw Tailwind colors** - Use semantic theme colors (`bg-bg-primary` not `bg-blue-300`)
3. **Don't test login without backend** - Frontend tests should work standalone
4. **Don't modify unrelated code** - Keep changes surgical and focused
5. **Don't skip type checking** - Always run `yarn type-check` before submitting
6. **Don't ignore linter warnings** - Fix all warnings in your code
7. **Don't use relative imports** - Always use module aliases

### AI Tools Reference

The `ai-tools/` directory contains helper scripts:

- **`generate-api-docs.ts`** - Extract and document all API endpoints
- **`extract-types.ts`** - Generate type documentation
- **`code-health-audit.ts`** - Analyze code quality metrics
- **`semantic-index.ts`** - Build search index for code navigation
- **`test-harness.ts`** - Template for automated testing workflows

Run any tool with:

```bash
yarn ts-node ai-tools/<script-name>.ts
```

### Resources for AI Agents

- **OpenAI Harness Engineering**: [https://openai.com/index/harness-engineering/](https://openai.com/index/harness-engineering/)
- **Loop Methodology**: [https://ghuntley.com/loop/](https://ghuntley.com/loop/)
- **Testing Library**: Best practices for user-centric testing
- **Zod Documentation**: Type-safe validation patterns

### Questions?

For issues or questions:

1. Check existing GitHub issues
2. Review [AGENTS.md](./AGENTS.md) and docs
3. Join GitHub Discussions
4. Create a new issue with detailed context
