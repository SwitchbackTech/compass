# Connect Microsoft Calendar

## Register the application

In the Microsoft Entra admin center, open **App registrations > New
registration**. Choose accounts in any organizational directory and personal
Microsoft accounts. Compass uses delegated access; do not add application
permissions.

Register the calendar callback as a Web redirect URI for each deployment:

- `http://localhost:3010/sync/microsoft`
- `https://staging.compasscalendar.com/sync/microsoft`
- `https://compasscalendar.com/sync/microsoft`

For a self-hosted instance, replace the origin with your sync service's public
origin. Also register the web sign-in callback, `/auth/microsoft/callback`,
on each frontend origin used for Microsoft sign-in. Local ports must match
the URLs printed by your development environment.

Under Microsoft Graph delegated permissions, add `offline_access`,
`User.Read`, `Calendars.ReadWrite`, and `People.Read`. Under **Certificates &
secrets**, create a client secret and record its expiry in your private
operations records. Store the secret value, not its identifier.

For work-tenant consent, complete publisher verification through your
Microsoft AI Cloud Partner Program account and associate the verified
publisher with the app. Tenant policies can still require administrator
consent. See Microsoft's [registration guide](https://learn.microsoft.com/en-us/graph/auth-register-app-v2)
and [publisher verification requirements](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview).

## Configure Compass

These are the Compass config keys. Add the matching GitHub
Environment variables and secrets on `staging-cloud`, `staging-selfhosted`,
and `production` for each deployment that supports Microsoft.

```yaml
microsoft:
  clientId: <entra-app-client-id>
  clientSecret: <entra-app-client-secret>
```

Both values are required together. The app registration uses the Entra
`/common` endpoint so personal and work or school accounts work with one
registration.

GitHub Environment:

- Variable: `MICROSOFT_CLIENT_ID`
- Secret: `MICROSOFT_CLIENT_SECRET`

The web bundle bakes `MICROSOFT_CLIENT_ID` at build time (same as Google).
Rebuild the web image after changing it.

## Verify and troubleshoot

After deploying configuration, check `/api/config`: Microsoft `signIn` and
`connect` should be enabled. Test both a personal Outlook account and a work
account, each with a disposable `compass-smoke` calendar. Connect on staging,
verify healthy state, edit in both directions, reload, and make a booking.
Record the date and observed results before calling the staging soak complete.

For `consentRequired`, reconnect and review the requested permissions. If
the tenant requires administrator consent, its administrator must approve
the delegated permissions. For redirect mismatch errors, compare the full
registered URI, including scheme, port, and path, with the callback sent by
Compass. For invalid-client errors, check the secret value and expiry and
restart the services after updating configuration.
