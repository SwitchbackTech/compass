#!/usr/bin/env bash
# Pick the next Compass Booking v1 issue for the autonomous loop.
# Prints found=true plus issue_number / title / url when a WP is eligible.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/booking-loop-lib.sh"

if [ -z "$REPO" ]; then
  echo "GITHUB_REPOSITORY or GH_REPO is required" >&2
  exit 1
fi

quota_waiting_json=$(
  gh issue list --repo "$REPO" --milestone "$MILESTONE" --state open \
    --label "$QUOTA_WAITING_LABEL" --limit 10 --json number,title,url
)

if [ "$quota_waiting_json" != "[]" ]; then
  quota_waiting_number=$(python3 -c '
import json, sys
issues = json.loads(sys.stdin.read())
issues.sort(key=lambda issue: issue["number"])
print(issues[0]["number"])
' <<<"$quota_waiting_json")
  quota_retry_at=$(gh api "repos/${REPO}/issues/${quota_waiting_number}/comments" \
    --paginate --jq '[.[].body | select(test("booking-loop-quota-retry-at="))] | last // ""' \
    | sed -n 's/.*booking-loop-quota-retry-at=\([^ >]*\).*/\1/p' | tail -n 1)
  quota_retry_due=$(RETRY_AT="$quota_retry_at" python3 - <<'PY'
from datetime import datetime, timezone
import os

retry_at = os.environ["RETRY_AT"]
if not retry_at:
    print("true")
else:
    try:
        timestamp = datetime.fromisoformat(retry_at.replace("Z", "+00:00"))
        print("true" if timestamp <= datetime.now(timezone.utc) else "false")
    except ValueError:
        print("true")
PY
)

  if [ "$quota_retry_due" != "true" ]; then
    echo "Booking loop is waiting for Cursor credits on #${quota_waiting_number} until ${quota_retry_at:-the next hourly retry}."
    set_output found false
    exit 0
  fi

  quota_waiting_selected=$(python3 -c '
import json, sys
issues = json.loads(sys.stdin.read())
issues.sort(key=lambda issue: issue["number"])
print(json.dumps(issues[0]))
' <<<"$quota_waiting_json")
  number=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["number"])' <<<"$quota_waiting_selected")
  title=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["title"])' <<<"$quota_waiting_selected")
  url=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["url"])' <<<"$quota_waiting_selected")
  echo "Retrying Booking issue: #${number} ${title}"
  set_output found true
  set_output issue_number "$number"
  set_output issue_title "$title"
  set_output issue_url "$url"
  exit 0
fi

running_json=$(
  gh issue list --repo "$REPO" --milestone "$MILESTONE" --state open \
    --label "$RUNNING_LABEL" --limit 10 --json number,updatedAt
)

stale=$(
  python3 -c '
import json, os, sys
from datetime import datetime, timezone, timedelta
issues = json.loads(sys.stdin.read() or "[]")
cutoff = datetime.now(timezone.utc) - timedelta(hours=3)
stale = []
fresh = 0
for issue in issues:
    raw = issue.get("updatedAt") or ""
    try:
        ts = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        fresh += 1
        continue
    if ts < cutoff:
        stale.append(str(issue["number"]))
    else:
        fresh += 1
print("STALE=" + ",".join(stale))
print("FRESH=" + str(fresh))
' <<<"$running_json"
)

stale_list=$(printf '%s\n' "$stale" | awk -F= '/^STALE=/{print $2}')
fresh_count=$(printf '%s\n' "$stale" | awk -F= '/^FRESH=/{print $2}')

if [ -n "$stale_list" ]; then
  IFS=',' read -ra stale_issues <<<"$stale_list"
  for n in "${stale_issues[@]}"; do
    [ -n "$n" ] || continue
    echo "Clearing stale ${RUNNING_LABEL} on #${n} (>3h)."
    gh issue edit "$n" --repo "$REPO" --remove-label "$RUNNING_LABEL" 2>/dev/null || true
    gh issue comment "$n" --repo "$REPO" --body \
      "booking-loop: cleared stale \`${RUNNING_LABEL}\` after 3 hours with no progress. This WP is eligible again." \
      2>/dev/null || true
  done
fi

if [ "${fresh_count:-0}" -gt 0 ]; then
  echo "An issue already has ${RUNNING_LABEL}; idle (concurrency 1)."
  set_output found false
  exit 0
fi

issues_json=$(
  gh issue list --repo "$REPO" --milestone "$MILESTONE" --state open \
    --limit 50 --json number,title,url,labels
)

if [ -z "$issues_json" ] || [ "$issues_json" = "[]" ]; then
  echo "No open issues in milestone ${MILESTONE}."
  set_output found false
  exit 0
fi

prs_json=$(
  gh pr list --repo "$REPO" --state open --limit 100 \
    --json number,title,body
)

selected=$(
  ISSUES_JSON="$issues_json" PRS_JSON="$prs_json" \
  SKIP_LABEL="$NEEDS_HUMAN_LABEL" RUNNING_LABEL="$RUNNING_LABEL" QUOTA_WAITING_LABEL="$QUOTA_WAITING_LABEL" python3 - <<'PY'
import json, os, re

issues = json.loads(os.environ["ISSUES_JSON"])
prs = json.loads(os.environ["PRS_JSON"])
skip_label = os.environ["SKIP_LABEL"]
skip_also = os.environ["RUNNING_LABEL"]
quota_waiting_label = os.environ["QUOTA_WAITING_LABEL"]

issues.sort(key=lambda i: i["number"])

def has_open_pr(number: int) -> bool:
    pattern = re.compile(
        rf"(?i)\b(?:fixes|fix|closes|close|resolves|resolve)[\s:]*#{number}\b"
    )
    needle = f"#{number}"
    for pr in prs:
        blob = f"{pr.get('title') or ''}\n{pr.get('body') or ''}"
        if pattern.search(blob) or needle in (pr.get("title") or ""):
            return True
    return False

for issue in issues:
    labels = {lab["name"] for lab in issue.get("labels") or []}
    if skip_label in labels or skip_also in labels or quota_waiting_label in labels:
        continue
    if has_open_pr(issue["number"]):
        continue
    print(json.dumps({
        "number": issue["number"],
        "title": issue["title"],
        "url": issue["url"],
    }))
    break
PY
)

if [ -z "$selected" ]; then
  echo "No eligible Booking v1 issue (all skipped, running, or already have a PR)."
  set_output found false
  exit 0
fi

number=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["number"])' <<<"$selected")
title=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["title"])' <<<"$selected")
url=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["url"])' <<<"$selected")

echo "Next booking issue: #${number} ${title}"
set_output found true
set_output issue_number "$number"
set_output issue_title "$title"
set_output issue_url "$url"

if [ -z "${GITHUB_OUTPUT:-}" ]; then
  echo "ISSUE_NUMBER=${number}"
  echo "ISSUE_TITLE=${title}"
  echo "ISSUE_URL=${url}"
fi
