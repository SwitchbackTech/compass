#!/usr/bin/env bash
# Pick the next eligible issue across AGENT_LOOP_MILESTONES (priority order).
# Prints found=true plus issue_number / title / url when a WP is eligible.
# With GITHUB_OUTPUT unset, also prints ISSUE_NUMBER= for local dry runs.
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/agent-loop-lib.sh"

if [ -z "$REPO" ]; then
  echo "GITHUB_REPOSITORY or GH_REPO is required" >&2
  exit 1
fi

mapfile -t MILESTONES < <(parse_milestones)
if [ "${#MILESTONES[@]}" -eq 0 ]; then
  echo "AGENT_LOOP_MILESTONES is empty" >&2
  exit 1
fi

list_labeled_in_milestone() {
  local milestone=$1
  local label=$2
  local json_fields=$3
  gh issue list --repo "$REPO" --milestone "$milestone" --state open \
    --label "$label" --limit 10 --json "$json_fields"
}

collect_labeled() {
  local json_fields=$1
  shift
  local combined='[]'
  local milestone label chunk
  for milestone in "${MILESTONES[@]}"; do
    for label in "$@"; do
      chunk=$(list_labeled_in_milestone "$milestone" "$label" "$json_fields")
      combined=$(json_concat "$combined" "$chunk")
    done
  done
  printf '%s' "$combined"
}

quota_waiting_json='[]'
for milestone in "${MILESTONES[@]}"; do
  chunk=$(json_concat \
    "$(list_labeled_in_milestone "$milestone" "$QUOTA_WAITING_LABEL" "number,title,url")" \
    "$(list_labeled_in_milestone "$milestone" "$LEGACY_QUOTA_WAITING_LABEL" "number,title,url")")
  if [ "$chunk" != "[]" ]; then
    quota_waiting_json=$chunk
    break
  fi
done

if [ "$quota_waiting_json" != "[]" ]; then
  quota_waiting_number=$(python3 -c '
import json, sys
issues = json.loads(sys.stdin.read())
issues.sort(key=lambda issue: issue["number"])
print(issues[0]["number"])
' <<<"$quota_waiting_json")
  quota_retry_at=$(gh api "repos/${REPO}/issues/${quota_waiting_number}/comments" --paginate \
    | sed -n \
      -e "s/.*${QUOTA_RETRY_MARKER}\\([^ >]*\\).*/\\1/p" \
      -e "s/.*${LEGACY_QUOTA_RETRY_MARKER}\\([^ >]*\\).*/\\1/p" \
    | tail -n 1)
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
    echo "Agent loop is waiting for Cursor credits on #${quota_waiting_number} until ${quota_retry_at:-the next scheduled retry}."
    set_output found false
    if [ -z "${GITHUB_OUTPUT:-}" ]; then
      echo "found=false"
    fi
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
  echo "Retrying issue: #${number} ${title}"
  set_output found true
  set_output issue_number "$number"
  set_output issue_title "$title"
  set_output issue_url "$url"
  if [ -z "${GITHUB_OUTPUT:-}" ]; then
    echo "ISSUE_NUMBER=${number}"
    echo "ISSUE_TITLE=${title}"
    echo "ISSUE_URL=${url}"
  fi
  exit 0
fi

running_json=$(collect_labeled "number,updatedAt" "$RUNNING_LABEL" "$LEGACY_RUNNING_LABEL")

stale=$(
  python3 -c '
import json, sys
from datetime import datetime, timezone, timedelta
issues = json.loads(sys.stdin.read() or "[]")
cutoff = datetime.now(timezone.utc) - timedelta(hours=3)
stale = []
fresh = 0
seen = set()
for issue in issues:
    number = issue["number"]
    if number in seen:
        continue
    seen.add(number)
    raw = issue.get("updatedAt") or ""
    try:
        ts = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        fresh += 1
        continue
    if ts < cutoff:
        stale.append(str(number))
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
    gh issue edit "$n" --repo "$REPO" --remove-label "$LEGACY_RUNNING_LABEL" 2>/dev/null || true
    gh issue comment "$n" --repo "$REPO" --body \
      "${COMMENT_PREFIX} cleared stale \`${RUNNING_LABEL}\` after 3 hours with no progress. This WP is eligible again." \
      2>/dev/null || true
  done
fi

if [ "${fresh_count:-0}" -gt 0 ]; then
  echo "An issue already has ${RUNNING_LABEL}; idle (concurrency 1)."
  set_output found false
  if [ -z "${GITHUB_OUTPUT:-}" ]; then
    echo "found=false"
  fi
  exit 0
fi

prs_json=$(
  gh pr list --repo "$REPO" --state open --limit 100 \
    --json number,title,body
)

picker_tmp=$(mktemp -d)
trap 'rm -rf "$picker_tmp"' EXIT
printf '%s' "$prs_json" >"${picker_tmp}/prs.json"

open_numbers=()
declare -A MILESTONE_ISSUES=()
for milestone in "${MILESTONES[@]}"; do
  issues_json=$(
    gh issue list --repo "$REPO" --milestone "$milestone" --state open \
      --limit 50 --json number,title,url,labels,body
  )
  if [ -z "$issues_json" ]; then
    issues_json='[]'
  fi
  MILESTONE_ISSUES["$milestone"]=$issues_json
  while IFS= read -r n; do
    [ -n "$n" ] && open_numbers+=("$n")
  done < <(printf '%s' "$issues_json" | issue_numbers_from_json)
done

selected=""
for milestone in "${MILESTONES[@]}"; do
  issues_json=${MILESTONE_ISSUES["$milestone"]}
  if [ -z "$issues_json" ] || [ "$issues_json" = "[]" ]; then
    continue
  fi
  printf '%s' "$issues_json" >"${picker_tmp}/issues.json"
  selected=$(
    OPEN_NUMBERS="${open_numbers[*]}" \
    SKIP_LABEL="$NEEDS_HUMAN_LABEL" LEGACY_SKIP_LABEL="$LEGACY_NEEDS_HUMAN_LABEL" \
    RUNNING_LABEL="$RUNNING_LABEL" LEGACY_RUNNING_LABEL="$LEGACY_RUNNING_LABEL" \
    QUOTA_WAITING_LABEL="$QUOTA_WAITING_LABEL" LEGACY_QUOTA_WAITING_LABEL="$LEGACY_QUOTA_WAITING_LABEL" \
    READY_LABEL="$READY_LABEL" \
    python3 - "${picker_tmp}/issues.json" "${picker_tmp}/prs.json" <<'PY'
import json, os, re, sys

issues = json.load(open(sys.argv[1], encoding="utf-8"))
prs = json.load(open(sys.argv[2], encoding="utf-8"))
open_numbers = {int(n) for n in os.environ.get("OPEN_NUMBERS", "").split() if n}
ready_label = os.environ["READY_LABEL"]
skip_labels = {
    os.environ["SKIP_LABEL"],
    os.environ["LEGACY_SKIP_LABEL"],
    os.environ["RUNNING_LABEL"],
    os.environ["LEGACY_RUNNING_LABEL"],
    os.environ["QUOTA_WAITING_LABEL"],
    os.environ["LEGACY_QUOTA_WAITING_LABEL"],
}

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

def is_human_approval(body: str) -> bool:
    if not body:
        return False
    return bool(re.search(r"(?i)approval\s+boundary\s*[:\n]+\s*human\b", body))

def has_open_dependency(body: str) -> bool:
    match = re.search(r"(?i)depends\s+on:\s*([^\n]+)", body or "")
    if not match:
        return False
    line = match.group(1).strip()
    if re.fullmatch(r"(?i)none|n/a|-", line):
        return False
    deps = [int(num) for num in re.findall(r"#(\d+)", line)]
    return any(dep in open_numbers for dep in deps)

for issue in issues:
    labels = {lab["name"] for lab in issue.get("labels") or []}
    if ready_label not in labels:
        continue
    if labels & skip_labels:
        continue
    body = issue.get("body") or ""
    if is_human_approval(body):
        continue
    if has_open_dependency(body):
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
  if [ -n "$selected" ]; then
    break
  fi
done

if [ -z "$selected" ]; then
  echo "No eligible issue (all skipped, running, human, blocked, or already have a PR)."
  set_output found false
  if [ -z "${GITHUB_OUTPUT:-}" ]; then
    echo "found=false"
  fi
  exit 0
fi

number=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["number"])' <<<"$selected")
title=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["title"])' <<<"$selected")
url=$(python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["url"])' <<<"$selected")

echo "Next issue: #${number} ${title}"
set_output found true
set_output issue_number "$number"
set_output issue_title "$title"
set_output issue_url "$url"

if [ -z "${GITHUB_OUTPUT:-}" ]; then
  echo "ISSUE_NUMBER=${number}"
  echo "ISSUE_TITLE=${title}"
  echo "ISSUE_URL=${url}"
fi
