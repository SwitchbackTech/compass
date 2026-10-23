# Prod journey (synthetic)

Manual Playwright run against `https://compasscalendar.com` for Tyler-approved
synthetic accounts only. Workflow:
[`.github/workflows/prod-journey.yml`](../../.github/workflows/prod-journey.yml).

`workflow_dispatch` only. Add a cron after test logins and
`STRIPE_SYNTHETIC_JOURNEY_DISCOUNT_ID` are in place and Tyler OKs production
scheduling.

Create GitHub Environment `prod-journey` with:

| Secret | Purpose |
|---|---|
| `DISCORD_ERRORS_WEBHOOK_URL` | Failure notifications |
| `PROD_JOURNEY_GOOGLE_EMAIL` | Google leg base email |
| `PROD_JOURNEY_GOOGLE_PASSWORD` | Google leg password |
| `PROD_JOURNEY_MICROSOFT_EMAIL` | Microsoft leg email |
| `PROD_JOURNEY_MICROSOFT_PASSWORD` | Microsoft leg password |
| `PROD_JOURNEY_APPLE_EMAIL` | Apple leg email |
| `PROD_JOURNEY_APPLE_PASSWORD` | Apple leg password |
| `STRIPE_SYNTHETIC_JOURNEY_DISCOUNT_ID` | Stripe `coupon_…` or `promo_…` for 100% off |

Production backend deploy config must also set:

| Deploy env / yaml | Purpose |
|---|---|
| `SYNTHETIC_JOURNEY_EMAILS` | Same base emails as the secrets above |
| `STRIPE_SYNTHETIC_JOURNEY_DISCOUNT_ID` | Same discount id (applied only for synthetic accounts) |

The spec completes embedded Checkout with a test card, cancels the subscription
in Settings, then continues logout/login/delete. Accounts are tagged synthetic
server-side and must not receive welcome email or pollute billing funnels.
