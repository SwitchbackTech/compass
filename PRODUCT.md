# Product

## Register

product

## Users

People who plan their days deliberately and want a calendar that gets out of the
way. They are comfortable with keyboards and shortcuts, and reach for Compass to
organize Month → Week → Day, then lock in on what matters now. Many start
anonymously (events in browser IndexedDB) before signing in; some connect Google
Calendar, but Google is always optional. The job: shape the day quickly, then
focus on a single task without the surrounding noise of a full calendar suite.

## Product Purpose

Compass is a daily planner for minimalists: organize your day and lock in. It
does a few calendar and task things well rather than everything passably. Core
surfaces are the calendar grid (Month/Week/Day), the Planner Sidebar (navigation,
account, Someday Events), the command palette, Day Mode (tasks and events
side-by-side), and Now Mode (focus on one task). Success is a user planning their
week in minutes and then spending the rest of the time heads-down, not managing
the tool. It is bootstrapped and built for the long term, so restraint and
durability beat feature accumulation.

## Brand Personality

Calm, focused, fast. The interface is quiet and stays out of the way; speed and
focus are the qualities the user should feel. There is a personal, human thread
too (the handwritten Custom Note, the "lock-in" framing) but it lives at the
edges, never at the expense of calm. Voice is plain and direct, never
salesy or buzzword-driven.

## Anti-references

- **Cluttered like Google/Outlook Calendar.** No dense toolbars, nested menus,
  feature sprawl, or busy chrome. The whole point is what Compass leaves out.
- **Generic shadcn look.** Avoid the default-component-library aesthetic:
  neutral-gray cards, stock radii and shadows, the interchangeable look shared by
  countless shadcn starters. Compass has its own dark, blue-accented identity.
- **Generic SaaS dashboard.** No card grids, hero-metric templates, or gradient
  accents standing in for design.
- **Playful / consumer-cute.** No bubbly mascots, candy colors, or heavy
  illustration.
- **Enterprise / corporate.** No heavy, dense, navy-and-gray business-software
  weight.

## Design Principles

- **Restraint is the feature.** Every element must earn its place; when in doubt,
  remove it. The product's value is what it omits.
- **Plan fast, then disappear.** Optimize for getting the day shaped in minutes
  and then receding so the user can focus. Chrome serves the work, not itself.
- **Keyboard-first, not keyboard-only.** Shortcuts and the command palette are
  primary paths; pointer interactions stay equally polished.
- **Calm by default, focus on demand.** The resting state is quiet; Now Mode is
  where intensity concentrates onto a single task.
- **Own identity over defaults.** Lean on Compass's dark, blue-accented voice
  rather than library defaults or category clichés.

## Accessibility & Inclusion

Target WCAG AA: body text ≥4.5:1 contrast, large text ≥3:1, against the dark
surfaces. Given the keyboard-first ethos, keep all primary flows fully
keyboard-operable with visible focus states.
