# Connect iCloud Calendar

Stub. A-12 fills in the iCloud CalDAV connect flow.

Until then, these are the Compass config keys. Add the matching GitHub
Environment variables and secrets on `staging-cloud`, `staging-selfhosted`,
and `production` before I-03 need them.

Sign in with Apple (identity only; it does not grant calendar access):

```yaml
apple:
  signIn:
    servicesId: <services-id>
    teamId: <team-id>
    keyId: <key-id>
    privateKey: <p8-key-contents>
```

All four values are required together. The web bundle bakes the Services ID
at build time.

iCloud calendar connect uses an app-specific password. Compass stores it
encrypted at rest with a 32-byte base64 key:

```yaml
sync:
  credentialEncryptionKey: <32-byte-base64>
```

Omit `credentialEncryptionKey` to leave Apple calendar connect off. The
self-host installer generates this key on a fresh install.

GitHub Environment:

- Variables: `APPLE_SIGNIN_SERVICES_ID`, `APPLE_SIGNIN_TEAM_ID`,
  `APPLE_SIGNIN_KEY_ID`
- Secrets: `APPLE_SIGNIN_PRIVATE_KEY`, `SYNC_CREDENTIAL_ENCRYPTION_KEY`
