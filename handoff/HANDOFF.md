# Handoff Handbook

Operating doc for the Compass Calendar team to collaborate work throughout the day.

## About Us

### Priorities

Things that matter most to us. If you need to make a decision, do not compromise on these things.

**Simplicity**. Everything about Compass Calendar must be simple. The code stays simple. The infra is simple to maintain. The product is simple to understand and use. Seek opportunities to simplify the code we already have. When adding new code, don't blindly accept complexity, even if it accomplishes the fix/enhancement. Instead, give it another look and try to do the work more simply.

**Quality**. As time goes on, the code gets cleaner and more maintainable. The product gets easier to use. Our design style gets more consistent.

**Accessibility**. Every component in our UI is accessible, so that users that rely on assistive devices can do everything a mouse and keyboard user acn.

### Team

One product owner (PO, me) and one Coding Agent (Claude or Codex, you).

#### Responsibilities

Product Owner: Owns the product. Reviews product analytics. Listens to users, tries the product, signs off on backlog of daily work. Finalizes long-term roadmap.

Coding Agent: Owns the code. Finds and fixes bugs. Ensures CI is fast, deterministic (no flakiness). Maintains technical docs. Maintains code quality and cleanliness. Keeps the UX and design visually pleasant, consistent, and accessible.

### Workflow principles

**Local planning.**
Instead of tracking work in GitHub (issues, projects, PR descriptions), we persist planning work in local markdown files in the handoff/ directory. We do not use GitHub for issues or project management.

**Local QA**. Instead of spinning up new cloud environments to test, we test using the local browser / computer. This ensures we're testing the product like a user would. CI is the always-on gate that runs on every PR regardless of who is at the machine; real-browser QA (local preview, `/qa-staging`) happens while the screen is present and unlocked. When I'm working while the PO is away with a locked screen, code, tests, CI, and git continue, and browser QA is sequenced for when the screen is unlocked.

## Daily Workflow

### Morning handoff

- PO drops the day's spec at `handoff/<date>/spec.md`.
- You review it and ask clarifying questions. **This is the one interactive gate** — the only point in the day where you're expected to ask me things before acting.
- PO might make revision requests.
- You store your plans in the day's `handoff/<date>/` folder.
- PO approves the plans.

### Daily implementation

- You do the work uninterrupted, using your own judgement — no mid-day questions.
- You open a PR per task and **merge it yourself once CI is green** (via the `ship` skill). I review async in staging; I don't gate the merge.
- If you hit a genuine blocker or a decision only I can make, **send a mobile push notification**, record it under PO follow-ups, and move on to other work rather than idling.
- Continue until the day's work is done or you run out of tokens/budget. On running out, checkpoint cleanly and record the exact next step in the summary doc so tomorrow resumes with zero re-derivation.
- Follow `handoff/agent-operating-rules.md` for model/effort tiering, the spike-budget rule, and the resume protocol.
- Maintain `handoff/<date>/summary.md` with:
  - Executive summary: High-level summary of the day's work.
  - Before and after: A markdown table that summarizes the day's work.
  - Decisions: Key decisions you made that we didn't talk about during planning.
  - PO follow-ups: Things you need me to do.

### Evening review

- PO tests changes in staging environment.
- PO review the work and ask questions to ensure I understand how the code is evolving.

### Evening cleanup

- You review all the changes from the day.
- You run the `cleanup` skill over the day's diffs and clean up the code (in one PR or multiple, up to you) to ensure simplicity and maintainability.

## Production workflow

As needed (currently twice a week), I manually deploy `main` to production.
