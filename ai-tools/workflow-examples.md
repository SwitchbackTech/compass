# AI Workflow Examples

This document demonstrates Harness and Loop-style development workflows for AI agents working on Compass.

## Table of Contents

- [Harness Engineering Workflows](#harness-engineering-workflows)
- [Loop Methodology Examples](#loop-methodology-examples)
- [Automated Testing Workflows](#automated-testing-workflows)
- [Code Review Automation](#code-review-automation)

---

## Harness Engineering Workflows

Based on OpenAI's Harness Engineering methodology: [https://openai.com/index/harness-engineering/](https://openai.com/index/harness-engineering/)

### Example 1: Adding a New API Endpoint

**Goal**: Add a new endpoint to get user statistics

**Harness Approach**:

1. **Understand the Pattern**

   ```bash
   # Study existing endpoint structure
   yarn ts-node ai-tools/generate-api-docs.ts
   # Review output to understand route patterns
   ```

2. **Define the Interface First**

   ```typescript
   // packages/core/src/types/user/user.stats.types.ts
   import { z } from "zod";

   export const UserStatsSchema = z.object({
     userId: z.string(),
     totalEvents: z.number(),
     completedTasks: z.number(),
     streak: z.number(),
     lastActive: z.string().datetime(),
   });

   export type UserStats = z.infer<typeof UserStatsSchema>;
   ```

3. **Create Test First**

   ```typescript
   // packages/backend/src/user/__tests__/user.stats.test.ts
   describe("User Statistics", () => {
     it("should return user statistics", async () => {
       const stats = await userService.getStats(testUserId);
       expect(stats).toMatchObject({
         userId: expect.any(String),
         totalEvents: expect.any(Number),
         completedTasks: expect.any(Number),
       });
     });
   });
   ```

4. **Implement the Route**

   ```typescript
   // packages/backend/src/user/user.routes.config.ts
   this.app
     .route("/api/user/stats")
     .all(verifySession())
     .get(userController.getStats);
   ```

5. **Verify and Document**

   ```bash
   # Run tests
   yarn test:backend

   # Regenerate docs
   yarn ts-node ai-tools/generate-api-docs.ts

   # Verify documentation includes new endpoint
   cat ai-tools/api-documentation.md | grep "/api/user/stats"
   ```

### Example 2: Refactoring with Safety Harness

**Goal**: Extract complex date logic into utility function

**Harness Approach**:

1. **Add Tests for Current Behavior**

   ```typescript
   // packages/core/src/util/date/__tests__/date.utils.test.ts
   describe("Date Utilities", () => {
     describe("existing behavior", () => {
       it("should handle timezone conversions", () => {
         // Test current implementation
       });
     });
   });
   ```

2. **Run Tests to Establish Baseline**

   ```bash
   yarn test:core
   # All tests should pass
   ```

3. **Refactor in Small Steps**

   ```typescript
   // Extract utility function
   export function convertToUserTimezone(date: Date, timezone: string): Date {
     // Refactored logic here
   }
   ```

4. **Test After Each Step**

   ```bash
   yarn test:core
   # Ensure no regressions
   ```

5. **Update All Call Sites**

   ```bash
   # Find all usages
   grep -r "oldImplementation" packages/

   # Replace incrementally, testing after each change
   ```

---

## Loop Methodology Examples

Based on Geoffrey Huntley's Loop: [https://ghuntley.com/loop/](https://ghuntley.com/loop/)

### Example 1: Feature Development Loop

**Goal**: Add calendar event filtering by category

**Loop Cycle**:

```
┌─────────────────────────────────────┐
│ 1. UNDERSTAND                       │
│ - Review existing filter logic      │
│ - Check Redux store structure       │
│ - Identify impact areas             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 2. PLAN                             │
│ - Define filter interface           │
│ - Map state changes needed          │
│ - Identify components to update     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 3. IMPLEMENT (Small Increment)      │
│ - Add filter type to Redux          │
│ - Test: yarn test:web               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 4. VERIFY                           │
│ - Run tests                         │
│ - Manual verification               │
│ - Code health audit                 │
└──────────────┬──────────────────────┘
               │
               ├─── If issues ──────┐
               │                     │
               │                     ▼
┌──────────────▼──────────────────────┐
│ 5. NEXT LOOP OR DONE                │
│ - Add filter UI                     │
│ - Repeat cycle                      │
└─────────────────────────────────────┘
```

**Implementation**:

```typescript
// Loop 1: Add type definition
// packages/core/src/types/filter.types.ts
export const EventFilterSchema = z.object({
  category: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Test and commit
// git add . && git commit -m "feat(core): add event filter types"

// Loop 2: Add Redux state
// packages/web/src/store/filter/filter.slice.ts
const filterSlice = createSlice({
  name: "filter",
  initialState: { category: [] /* ... */ },
  // ...reducers
});

// Test and commit
// yarn test:web
// git add . && git commit -m "feat(web): add filter state to Redux"

// Loop 3: Add UI component
// packages/web/src/views/Calendar/FilterPanel.tsx
// Test and commit

// Loop 4: Wire up to backend
// Test and commit

// Each loop: small, testable, verifiable increment
```

### Example 2: Bug Fix Loop

**Goal**: Fix date display bug in calendar view

**Loop Cycle**:

```typescript
// Loop 1: REPRODUCE THE BUG
describe('Calendar Date Display', () => {
  it('should display dates in user timezone', () => {
    // Write failing test that reproduces the bug
    const event = createTestEvent({ date: '2024-01-01T12:00:00Z' });
    render(<CalendarView event={event} />);
    expect(screen.getByText(/Jan 1, 2024/i)).toBeInTheDocument();
    // This should fail, confirming the bug
  });
});

// yarn test:web
// Confirm test fails as expected

// Loop 2: FIX THE BUG (Minimal change)
// packages/web/src/views/Calendar/DateDisplay.tsx
export function formatEventDate(date: string): string {
  return dayjs(date).tz(userTimezone).format('MMM D, YYYY');
  // Changed from: dayjs(date).format(...)
}

// Loop 3: VERIFY FIX
// yarn test:web
// Test should now pass

// Loop 4: CHECK FOR REGRESSIONS
// yarn test:core && yarn test:backend
// yarn audit:code-health

// Loop 5: MANUAL VERIFICATION
// yarn dev:web
// Navigate to calendar and verify fix visually

// Loop 6: COMMIT
// git add . && git commit -m "fix(web): correct date display timezone handling"
```

---

## Automated Testing Workflows

### Workflow 1: Test-Driven Development

```typescript
// Step 1: Write test (RED)
// packages/web/src/hooks/__tests__/useEventForm.test.ts
describe("useEventForm", () => {
  it("should validate event title is not empty", () => {
    const { result } = renderHook(() => useEventForm());

    act(() => {
      result.current.setTitle("");
    });

    expect(result.current.errors.title).toBe("Title is required");
  });
});

// Step 2: Run test (should fail)
// yarn test:web

// Step 3: Implement (GREEN)
// packages/web/src/hooks/useEventForm.ts
export function useEventForm() {
  const [errors, setErrors] = useState({});

  const validateTitle = (title: string) => {
    if (!title.trim()) {
      setErrors((prev) => ({ ...prev, title: "Title is required" }));
      return false;
    }
    return true;
  };

  // ...
}

// Step 4: Run test (should pass)
// yarn test:web

// Step 5: Refactor if needed
// Keep tests passing while improving code
```

### Workflow 2: Regression Test Automation

```typescript
// Create test harness for known bugs
// ai-tools/test-harness/regression-suite.ts
import { runTest } from "./test-utils";

const regressionTests = [
  {
    id: "BUG-123",
    description: "Date picker should handle leap years",
    test: async () => {
      const result = await testDatePicker({ date: "2024-02-29" });
      expect(result.isValid).toBe(true);
    },
  },
  {
    id: "BUG-456",
    description: "Drag-drop should not duplicate events",
    test: async () => {
      const result = await testDragDrop();
      expect(result.eventCount).toBe(1);
    },
  },
];

// Run all regression tests
export async function runRegressionSuite() {
  for (const test of regressionTests) {
    console.log(`Testing ${test.id}: ${test.description}`);
    await test.test();
  }
}
```

---

## Code Review Automation

### Workflow 1: Pre-Commit Checks

```bash
#!/bin/bash
# .git/hooks/pre-commit (already handled by Husky)

# Type check
echo "Running type check..."
yarn type-check || exit 1

# Lint
echo "Running prettier..."
yarn prettier . --write

# Tests (quick smoke test)
echo "Running tests..."
yarn test:core || exit 1

echo "✅ Pre-commit checks passed"
```

### Workflow 2: AI-Assisted Review

```typescript
// ai-tools/review-assistant.ts
// Checks code before PR submission

interface ReviewChecklist {
  hasTests: boolean;
  typesafe: boolean;
  usesAliases: boolean;
  documented: boolean;
  complexity: "low" | "medium" | "high";
}

export async function reviewCode(files: string[]): Promise<ReviewChecklist> {
  const results: ReviewChecklist = {
    hasTests: true,
    typesafe: true,
    usesAliases: true,
    documented: true,
    complexity: "low",
  };

  for (const file of files) {
    // Check for test file
    const testExists = fs.existsSync(file.replace(/\.tsx?$/, ".test.ts"));
    results.hasTests = results.hasTests && testExists;

    // Check for relative imports
    const content = fs.readFileSync(file, "utf-8");
    if (content.includes('from "../')) {
      results.usesAliases = false;
    }

    // Check complexity
    const complexity = analyzeComplexity(content);
    if (complexity > 20) {
      results.complexity = "high";
    }
  }

  return results;
}
```

---

## Summary

These workflows demonstrate:

1. **Harness Engineering**: Building safety nets through tests and tooling
2. **Loop Methodology**: Small, incremental changes with continuous verification
3. **Automation**: Scripts and tools to speed up repetitive tasks
4. **Safety**: Multiple verification steps before committing

### Key Principles

- **Small increments**: Each loop should be < 1 hour of work
- **Continuous testing**: Test after every change
- **Automated checks**: Use tooling to catch issues early
- **Documentation**: Keep docs in sync with code
- **Verification**: Multiple layers of safety

### Next Steps

1. Study these examples
2. Apply patterns to your work
3. Create your own workflow variants
4. Share improvements back to the team
