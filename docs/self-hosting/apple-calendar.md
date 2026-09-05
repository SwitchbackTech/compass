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

In Apple Developer, the Services ID Return URL must be a POST to the
backend, not the SPA:

```
POST {BACKEND_URL}/api/auth/apple/callback
```

Apple posts the authorization result (`response_mode=form_post`). Compass
reads `code` and `state` from that form body, then 302-redirects the browser
to:

```
{FRONTEND_URL}/auth/apple/callback?code=...&state=...
```

A missing or mismatched `state` is rejected (HTTP 400). Do not register the
SPA path as the Return URL. Apple will not GET that URL.

Apple may send a private relay address (`@privaterelay.appleid.com`) instead
of the user's real email. Compass keys the Apple identity by the id_token
`sub`, not by that email, so a later sign-in with a different relay still
resolves to the same user.

Apple includes the user's name only on the first authorization. Compass
stores that name when it is present. Later sign-ins omit it.

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
