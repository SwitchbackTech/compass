# Coding Conventions

Opinionated guide for writing code in the project, with a brief rationale for each rule. This guide is meant to reduce the cognitive load of understanding and contributing to the Compass codebase.

Follow this guide to ensure consistency and give your PR the best change of being accepted.

These rules are not set in stone, and there may be exceptions. If you'd like to propose a change to the rules, we welcome your suggestions in the form of a GitHub issue in this repository. In that issue, explain why we should adjust the rule, provide an alternative, and explain why the alternative is better.

## Commit Messages

### Commit & PR Conventions

Use [conventional commits](https://www.conventionalcommits.org), with an emoji at the start of the commit message.

Using emojis on commit messages provides an easy way of identifying the purpose or intention of a commit with only looking at the emojis used.

For a CLI tool that helps follow these formats, see [gitmoji](https://github.com/carloscuesta/gitmoji).

Commit syntax should be:
`<intention> [scope?][:?] <message>`

- intention: An emoji that matches the changes.
- scope: An optional string that adds contextual information for the scope of the change.
- message: A brief explanation of the change.

## Comments

### No TODOs in comments

Don't use comments to track TODOs. Instead, create an issue for it in GitHub.

### Don’t overuse comments

Comments are helpful if:

1. The code itself is ambiguous or complicated
2. You’re writing a shared util that is ambiguous and used by different areas of the codebase.
3. They give AI more context to understand the codebase.

While comments can be helpful to explain complexity, strive for simplicity by:

1. Writing code that is self-explanatory
2. Writing tests that explain the code
3. Creating a diagram/doc in this repo. You can then create a comment that links to the diagram/doc.

### Why this rule exists

Comments start out as a net-positive. They help the reader understand the code. But as the code changes, the comments often don't. This leads to a divergence between the code and the comments. The comments become misleading, and subsequent readers have to spend time figuring out what's true and what's not.

Having a codebase with lots of comments encourages more comments. Eventually, comments start to take on the role of task management, where TODOs and FIXMEs are scattered throughout the codebase. It's easy to forget about these comments, so they become stale.

Comments quickly become a net-negative for the codebase. Although they let you move fast initially, they're slowing everyone else down in the long run.

We want to always use the best tool for the job. The best way to make the code understandable is to write cleaner code. The best way to explain high-level process flows is through a diagram. The best tool to track tasks is an issue tracker. Comments are not the best tool for any of these jobs.

## Cleanup

### No Dead Code

If the code is not used, do not add it.
Do not proactively add half-implemented features of fixes.
If you see code that is not used, create a new PR to delete it. Deleting it in a separate PR makes it easier to review the rest of your changes.

It is, however, OK to create separate PRs to gradually implement features. However, the PRs should be focused on a single feature or fix, and they should be consecutive. Do not allow long time delays between PRs in a set that is related to the same feature, as this makes it more likely for the code to become stale and eventually die.

#### Why this rule exists

The codebase should reflect the reality of the product. Having a mix of implemented and unimplemented features makes it harder to understand the product and to maintain.

### Leave the code better than you found it

How to do that:

1. **Delete dead code**: If you see a function or variable that isn't used, delete it. We only want code that is used to exist in the codebase. It's easier to understand and maintain. Just do this deletion in a separate commit, so reviewers can differentiate your cleanup from your feature work.
2. **Improve tests**: If you're working in a file and see a test that could be improved, improve it.
3. **Do small refactors**: If you're working in a file and see a function or component that could be improved, refactor it. Be intentional about only changing the files that are relevant to your issue. For an example of how to do these refactors, see the commits and comments in [this PR](https://github.com/SwitchbackTech/compass/pull/209#issuecomment-2569223427).

4. **Do larger refactors**: If you think the codebase would improve through a larger refactor, open an issue first. In that issue, explain the problem, the solution, and the benefits of the solution. Get buy-in from the team before starting the refactor.
