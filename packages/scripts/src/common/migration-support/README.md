# Migration support

These files support historical database migrations discovered by the Compass
CLI. They are not part of the current runtime data model.

Keep a helper here while any checked-in migration imports it; removing one can
break upgrades from an older self-hosted release even after Compass-managed
environments have completed the migration.
