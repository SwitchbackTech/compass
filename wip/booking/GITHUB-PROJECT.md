# GitHub Project: Compass Booking

Desired org project (same pattern as closed
[Google Subcalendars](https://github.com/orgs/KeepSoftwareSimple/projects/6)):

- Owner: `KeepSoftwareSimple`
- Title: **Compass Booking**
- Columns: Backlog, Ready, In progress, Done
- Linked repo: `KeepSoftwareSimple/compass-calendar`

## What this token could create

Cloud-agent `GH_TOKEN` can create issues and milestones, but **cannot**
run `createProjectV2` (`Resource not accessible by personal access token`
/ missing `project` scope).

Stand-in until the org project exists:

- Milestone: [Compass Booking v1](https://github.com/KeepSoftwareSimple/compass-calendar/milestone/7)
- Issues: #2970–#2978 (`agent-ready`)

## One-time create (org owner, token with `project` scope)

```bash
# Create the project
gh project create --owner KeepSoftwareSimple --title "Compass Booking"

# Note the project number from the URL, then add every WP issue:
for n in 2970 2971 2972 2973 2974 2975 2976 2977 2978; do
  gh project item-add <PROJECT_NUMBER> --owner KeepSoftwareSimple \
    --url "https://github.com/KeepSoftwareSimple/compass-calendar/issues/${n}"
done
```

Put WP-01 (#2970) and WP-02 (#2971) in **Ready** (no WP dependencies).
Leave WP-03–WP-09 in **Backlog** until their `depends on` issues are
closed. Move a card to **In progress** when TRACKING.md is `running`.

## Issue map

| WP | Issue | Ready when |
| --- | --- | --- |
| 01 | https://github.com/KeepSoftwareSimple/compass-calendar/issues/2970 | now |
| 02 | https://github.com/KeepSoftwareSimple/compass-calendar/issues/2971 | now (parallel with 01) |
| 03 | https://github.com/KeepSoftwareSimple/compass-calendar/issues/2972 | WP-01 done |
| 04 | https://github.com/KeepSoftwareSimple/compass-calendar/issues/2973 | WP-01 done |
| 05 | https://github.com/KeepSoftwareSimple/compass-calendar/issues/2974 | WP-01 and WP-02 done |
| 06 | https://github.com/KeepSoftwareSimple/compass-calendar/issues/2975 | WP-03, 04, 05 done |
| 07 | https://github.com/KeepSoftwareSimple/compass-calendar/issues/2976 | WP-03 done |
| 08 | https://github.com/KeepSoftwareSimple/compass-calendar/issues/2977 | WP-06 done |
| 09 | https://github.com/KeepSoftwareSimple/compass-calendar/issues/2978 | WP-07 and WP-08 done |
