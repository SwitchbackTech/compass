#!/usr/bin/env bash
# Manual prod user-journey Playwright run. Disabled until operator secrets exist.
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"

PROVIDER=${PROD_JOURNEY_PROVIDER:-}
if [ -z "$PROVIDER" ]; then
  echo "::error::PROD_JOURNEY_PROVIDER is unset (expected google, microsoft, or apple)"
  exit 1
fi

PREFIX="PROD_JOURNEY_${PROVIDER^^}_EMAIL"
PASSWORD_KEY="PROD_JOURNEY_${PROVIDER^^}_PASSWORD"
if [ -z "${!PREFIX:-}" ] || [ -z "${!PASSWORD_KEY:-}" ]; then
  echo "::error::Missing ${PREFIX} or ${PASSWORD_KEY} for prod journey leg ${PROVIDER}"
  exit 1
fi

if [ -z "${STRIPE_SYNTHETIC_JOURNEY_DISCOUNT_ID:-}" ]; then
  echo "::error::Missing STRIPE_SYNTHETIC_JOURNEY_DISCOUNT_ID (100% off coupon or promotion code for synthetic checkout)"
  exit 1
fi

export PROD_JOURNEY_ENABLED=1
export PROD_BASE_URL="${PROD_BASE_URL:-https://compasscalendar.com}"

bunx playwright install chromium
bunx playwright test --config e2e/playwright.prod-journey.config.ts
