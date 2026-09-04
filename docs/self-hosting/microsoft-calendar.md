# Connect Microsoft Calendar

Stub. M-14 fills in the Outlook / Microsoft 365 connect flow.

Until then, these are the Compass config keys. Add the matching GitHub
Environment variables and secrets on `staging-cloud`, `staging-selfhosted`,
and `production` before M-09 / I-03 need them.

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
