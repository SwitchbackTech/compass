# How to Contribute

## Setting Expectations

We're laser-focused on two things:

1. Helping minimalists manage their schedule, so they can do more of what matters
2. Becoming profitable, so that we can continue doing #1 for decades

These goals require us to be very selective about who we work with, as we don't have the bandwidth to review every PR or respond to every issue. So, we have a few requirements for new contributors:

1. Commit 4 hours / week for a minimum of six months
1. Respond to our internal chats within 24 hours M-F.

It's a lot to ask, especially for those accustomed to other OSS projects that welcome driveby PRs.

This is our attempt to maintain the transparency and collaboration we love about OSS while also shielding us from low-effort work.

If those goals align with yours, consider applying to become a contributor.
Simply DM Tyler on [X](https://x.com/_TylerDane_) or [LinkedIn](https://www.linkedin.com/in/tyler-dane/) with links that showcase your skill and a paragraph about why you'd like to help Compass Calendar.

**If you skip the application and blindly submit a PR, it will not be accepted.**

### What's in it for you

#### Experience

Working on Compass gives you unique experience that you won't get anywhere else.

- **Meritocracy**: Compass operates on outputs, not resumes or locales. An Ex-Googler in SF gets the same treatment as someone in Mongolia who just learned HTML; We only care about the quality of the work you can produce.

- **Fullstack**: Since this is an open-source monorepo, you can get experience getting things to work end-to-end without silos. This'll help you become a true fullstack engineer.

- **Transparency**: Code isn't the only thing that we're transparent about. We publish our handbook, technical guides, docs, and lessons-learned across our repos and social media. Working in an open culture will give you more opportunities to grow as an engineer and leader.

#### Recognition

What may be offered after consistent excellence

- Reference for your next job
- Preference for future opportunities @ Switchback (the company behind Compass)

These are the criteria we use to assess the quality of your work. If you don't meet these criteria, we may reject your PR.

1. **Code quality**: Is the code readable, well-organized, and testable? Does it follow best practices? Does it provide good UX?
2. **Expertise**: Does your work reflect your skill level? Did you need a lot of technical guidance in order to get started? Were you able to make good judgments about the requirements and implementation?
3. **Communication**: If you got blocked, did you reach out for help? Did you communicate your plans and progress clearly? Are your commits, PR descriptions, and comments easy to understand?
4. **Reliability**: Did you submit your PR, update based on comments in a timely manner? If something came up that prevented you from completing a PR on time, did you let us know?

### You're ready to pick up a new task

1. Submit an application (see above).
1. Review [the quarterly backlog](https://github.com/orgs/SwitchbackTech/projects/4/views/8). This is the view that shows each important issue by the quarter it's planned for.
1. If this is your first time contributing, pick an issue in the `Ready` state for the _next_ quarter that has a `Good first issue` tag. Working on an issue in the next quarter gives you time to familiarize yourself with the codebase while still working on a priority change. It also gives us the chance to assess the quality of work and your reliability before giving you more responsibility.
1. Find an issue you'd like to work on.
1. Fork the repository
1. Create a new branch with a descriptive name
1. Make your changes, following the coding conventions
1. Manually test your changes. See the testing guide for more info on how to do this sufficiently.
1. Push your branch to your fork
1. Create a pull request, including screenshots/video documenting the behavior. Also explain the steps you took to manually verify the functionality. Blindly submitting AI-generated code without showing evidence of thorough testing will result in the PR being denied.
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
