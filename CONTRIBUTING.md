# How to Contribute

## Setting Expectations

We're laser-focused on two things:

1. Helping minimalists manage their schedule and focus, so they can do more of what matters
2. Being profitable, so that we can continue doing #1 for decades

We're only accepting contributions that help us reach those goals. If you submit a PR that doesn't align with our goals, it will be rejected. The best way to avoid this scenario is to confirm that your proposed changes align with our priorities. You can verify this by reviewing the quarterly backlog, timeline, and app docs in the main Compass repo (more links and details on how to do this below).

If these goals align with your own, we'd love to work with you!

### What's in it for you

#### Experience

Working on Compass gives you unique experience that you won't get anywhere else.

- **Meritocracy**: Compass operates on outputs, not resumes or locales. An Ex-Googler in SF gets the same treatment as someone in Mongolia who just learned HTML; We only care about the quality of the work you can produce.

- **Fullstack**: Since this is an open-source monorepo, you can get experience getting things to work end-to-end without silos. This'll help you become a true fullstack engineer.

- **Transparency**: Code isn't the only thing that we're transparent about. We publish our handbook, technical guides, docs, and lessons-learned across our repos and social media. Working in an open culture will give you more opportunities to grow as an engineer and leader.

#### Recognition

What may be offered after consistent excellence\*:

- Reference for your next job
- Compensation
- Preference for future opportunities @ Switchback (the company behind Compass)

\*These are the criteria we use to assess the quality of your work. If you don't meet these criteria, we may reject your PR.

1. **Code quality**: Is the code readable, well-organized, and testable? Does it follow best practices? Does it provide good UX?
2. **Expertise**: Does your work reflect your skill level? Did you need a lot of technical guidance in order to get started? Were you able to make good judgments about the requirements and implementation?
3. **Communication**: If you got blocked, did you reach out for help? Did you communicate your plans and progress clearly? Are your commits, PR descriptions, and comments easy to understand?
4. **Reliability**: Did you submit your PR, update based on comments in a timely manner? If something came up that prevented you from completing a PR on time, did you let us know?

## Find Something to Work On

- Code contributions: [Good first issues for Compass](https://github.com/SwitchbackTech/compass/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — app contributions
- Doc improvements: We welcome typo fixes, broken links, clearer explanations, new examples, and updated screenshots.

### You're ready to pick up a new task

1. Review [the quarterly backlog](https://github.com/orgs/SwitchbackTech/projects/4/views/8). This is the view that shows each important issue by the quarter it's planned for.
1. If this is your first time contributing, pick an issue in the `Ready` state for the _next_ quarter that has a `Good first issue` tag. Working on an issue in the next quarter gives you time to familiarize yourself with the codebase while still working on a priority change. It also gives us the chance to assess the quality of work and your reliability before giving you more responsibility.
1. Find an issue you'd like to work on.
1. Ask any clarifying questions in the issue thread.
1. Start working on the issue. If you're a new contributor, we will NOT assign the issue to you before a PR is submitted. This helps us avoid holding an issue for an extended period of time.
1. Fork the repository
1. Create a new branch with a descriptive name
1. Make your changes, following the coding conventions
1. Manually test your changes. See the testing guide for more info on how to do this sufficiently.
1. Push your branch to your fork
1. Create a pull request
1. Link the PR to the issue it solves by including the issue number in the PR description and using a [closing keyword](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/using-keywords-in-issues-and-pull-requests#linking-a-pull-request-to-an-issue). For example: `Fixes #123`
1. Wait for us to review the PR. You can continue this process with another issue while waiting for feedback.

### You found an undocumented bug

- If the bug is a security vulnerability, please [report it here](https://github.com/SwitchbackTech/compass/security).
- Ensure the bug was not already reported by searching under the issues
- If it's a new bug, open a new issue, including as much relevant information as possible.

### You want to add a new feature or dramatically change an existing one

Larger features or changes that are not already in the backlog or otherwise aligned with our current priorities will most likely be rejected. If you're unsure, open a GitHub issue before you start working. This will help ensure that your work is aligned with the project's goals and that you don't spend time on something that won't be prioritized.

### You fixed whitespace, formatted code, or made a purely cosmetic patch

Changes that are cosmetic in nature and do not add anything substantial to the stability, functionality, or testability will generally not be accepted.

## For AI Agents

This section provides specific guidelines for AI coding agents working on Compass.

### Getting Started

1. **Read the Documentation First**
   - Start with [AGENTS.md](./AGENTS.md) for complete development instructions
   - Review [README.md](./README.md) for project overview
   - Check existing issues and PRs for context

2. **Environment Setup**

   ```bash
   bun install
   cp packages/backend/.env.local.example packages/backend/.env.local
   bun run dev:web  # Verify frontend works
   ```

   Bun is the primary package manager and command runner for this repo. Node.js 24+ is still required for retained tooling such as the web/backend/scripts Jest suites and the production Node build output.

3. **Understand the Codebase**
   - Use `bun run ai:index` to generate semantic search index
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
   bun run type-check
   ```

2. **Run Tests**

   ```bash
   bun run test:core
   bun run test:web
   bun run test:backend
   ```

3. **Check Code Health**

   ```bash
   bun run audit:code-health
   ```

4. **Format Code**

   ```bash
   bunx prettier . --write
   ```

5. **Generate Documentation** (if you added/modified APIs)
   ```bash
   bun run docs:generate
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

- [ ] Unit tests pass (`bun run test:core`, `bun run test:web`, `bun run test:backend`)
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
5. **Don't skip type checking** - Always run `bun run type-check` before submitting
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
bun ai-tools/<script-name>.ts
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
