# Migration support

These files support historical database migrations discovered by the Compass
CLI. They are not part of the current runtime data model.

Keep a helper here while any checked-in migration imports it; removing one can
break upgrades from an older self-hosted release even after Compass-managed
environments have completed the migration.

## Test baseline

Compass supports upgrades through every checked-in migration, including the
2025 migrations. The active 2026 migration tests construct their legacy input
shapes through those migrations and verify the final schema, idempotency, and
persistence behavior. The standalone 2025 integration suites were therefore
retired: they duplicated that supported-path coverage without exercising a
distinct current contract. Historical migrations remain discoverable by Umzug
and must not be removed merely because their dedicated test file is gone.
