# User/Password Sign-up: Master Plan

Add email/password authentication to Compass alongside Google OAuth, enabling:

- Sign up/sign in without Google
- Self-hosting without Google dependency
- Connecting Google Calendar later
- Signing in from any device with either email/password or Google OAuth

## PR Sequence

| PR  | Plan File                    | Name                     | Purpose                                                                                                             |
| --- | ---------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 1   | [PW-PLAN-1.md](PW-PLAN-1.md) | User schema & guards     | Make `google` optional, add `hasGoogleConnected`, guard GCal call sites. **No behavior change for existing users.** |
| 2   | [PW-PLAN-2.md](PW-PLAN-2.md) | Email/Password auth      | Add Supertokens EmailPassword, backend sign-up/sign-in, wire AuthModal.                                             |
| 3   | [PW-PLAN-3.md](PW-PLAN-3.md) | Session toast            | Generic "Session expired" message; open AuthModal instead of Google-only.                                           |
| 4   | [PW-PLAN-4.md](PW-PLAN-4.md) | Connect Google (linking) | Link Google to email/pw account; sync Compass-only events to Google.                                                |
| 5   | [PW-PLAN-5.md](PW-PLAN-5.md) | Tests & polish           | E2E/unit tests; auth state naming; optional improvements.                                                           |

## Dependencies

- PR 1 must merge first (foundation for all others).
- PR 2 depends on PR 1.
- PR 3 depends on PR 2 (AuthModal must support both auth methods).
- PR 4 depends on PR 2 and PR 1.
- PR 5 can run in parallel or after PR 4.

## Rollout Safety

- Each PR is self-contained and mergable independently.
- PR 1 and PR 3 introduce no new user-facing flows; they only harden existing behavior.
- PR 2 enables the new flow; PR 4 extends it.
- All PRs include validation steps and test commands.

## Key Files

| Area          | Path                                                               |
| ------------- | ------------------------------------------------------------------ |
| Supertokens   | `packages/backend/src/common/middleware/supertokens.middleware.ts` |
| User schema   | `packages/core/src/types/user.types.ts`                            |
| User service  | `packages/backend/src/user/services/user.service.ts`               |
| Google auth   | `packages/backend/src/auth/services/google.auth.service.ts`        |
| Event parser  | `packages/backend/src/event/classes/compass.event.parser.ts`       |
| Event service | `packages/backend/src/event/services/event.service.ts`             |
| Session toast | `packages/web/src/common/utils/toast/session-expired.toast.tsx`    |
| Auth modal    | `packages/web/src/components/AuthModal/AuthModal.tsx`              |
| Auth state    | `packages/web/src/common/utils/storage/auth-state.util.ts`         |

## Open Decisions

1. **Auth state**: Rename `isGoogleAuthenticated` → `hasAuthenticated` (PR 5).
2. **Profile picture**: Placeholder for email/pw users (PR 2).
3. **Self-hosted mode**: Optional env to hide Google when not configured (future).
