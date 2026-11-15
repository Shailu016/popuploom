# Incident: PBKDF2 work factor above the Cloudflare Workers limit

**Date:** 15 November 2026
**Severity:** High — password sign-in, registration and password reset were
failing in production.
**Status:** Fixed and verified.
**Affected surface:** Cloudflare Worker `popforge` (production), password auth
only. Google sign-in for existing linked accounts was not affected.

---

## 1. Symptom

A mobile sign-in attempt on `https://popuploom.com/studio.html` displayed:

> Pbkdf2 failed: iteration counts above 100000 are not supported (requested 600000).

The raw runtime error was rendered in the login form.

---

## 2. Root cause

Commit `1cad808` (7 November 2026) raised the Worker password work factor from
100,000 to 600,000 PBKDF2-SHA256 iterations to align with OWASP guidance.

Cloudflare's production edge enforces a hard limit of **100,000 PBKDF2
iterations** and throws `NotSupportedError` above it. This is a platform policy
limit, not an API contract:

- Node does not enforce it.
- `wrangler dev` does not enforce it.
- The workerd binary bundled with the local toolchain does not enforce it.
- The deployed Cloudflare edge does enforce it.

Every local and CI test therefore passed while production failed. The failure
was invisible until a password hash was actually derived in the deployed
runtime.

Cloudflare has merged workerd PR #7550 to raise the default cap to 1,000,000,
but the production edge was still enforcing 100,000 at the time of this
incident. The fix must not depend on an unverified rollout.

---

## 3. Impact

The Worker calls `hashPassword()` or `verifyPassword()` in these paths:

| Path | Effect |
|---|---|
| New registration | Failed while creating the hash. |
| Unknown-email login | Failed while generating the dummy hash used for timing equalisation. |
| Existing-account login | Password verification at the stored 100,000 iterations succeeded, then the rehash-on-login step called `hashPassword()` at 600,000 and failed. |
| Password reset | Failed while hashing the new password. |
| Password change | Failed while hashing the new password. |
| New Google account or unverified-account linking | Failed while creating the random password hash. |

The login route returned `e.message` for unexpected errors, so the internal
runtime message reached the browser.

Production database check:

- 2 users.
- Both hashes were `pbkdf2$100000$...`.
- No `pbkdf2$600000$...` rows existed.

Because the stored hashes were already at 100,000, lowering the constant
restored access without a password reset or data migration.

---

## 4. Fix

### 4.1 Work factor

`worker/auth.js` now defines:

```js
const MAX_PBKDF2_ITERATIONS = 100000;
const PBKDF2_ITERATIONS = MAX_PBKDF2_ITERATIONS;
```

100,000 is the maximum the production edge accepts. The comment in the file
records why it must not be raised without edge verification.

### 4.2 Fail closed above the cap

`verifyPassword()` rejects stored hashes above 100,000 instead of calling
`deriveBits()` and throwing. No such rows exist; the guard prevents a future
stored hash from turning into an unhandled runtime error.

### 4.3 Do not leak internal errors

The auth routes now return generic 5xx messages and log the detail server-side:

| Route | Unexpected-error response |
|---|---|
| `/api/auth/login` | `Sign-in is temporarily unavailable. Please try again.` |
| `/api/auth/register` | `Could not create your account. Please try again.` |
| `/api/auth/verify-email` | `Could not verify this link. Please try again.` |
| `/api/auth/google` | `Google sign-in is temporarily unavailable. Please try again.` |
| `/api/auth/profile` | `Could not save your profile. Please try again.` |
| `/api/auth/account` | `Could not update your account. Please try again.` |

`manageAccount()` now throws `ApiError` for validation failures so the route can
preserve the existing user-facing messages and 400 statuses while keeping
unexpected database/runtime errors generic.

The login route also forwards the machine-readable `code` field, so the
`EMAIL_NOT_VERIFIED` resend flow receives the code it already expects.

---

## 5. Regression coverage

### Unit tests

- Assert the Worker work factor is at most 100,000 and equals the declared
  maximum.
- Monkey-patch `crypto.subtle.deriveBits` to emulate the production policy and
  run registration, login and unknown-email login through it.
- Insert a synthetic `pbkdf2$600000$...` row and assert login fails with the
  generic 401 instead of throwing.

### Integration tests

- Emulate the 100,000-iteration edge cap.
- Register an account through the HTTP route and assert `201`.
- Log in with an unknown email and assert the generic `401`.
- Force an unexpected PBKDF2 failure and assert the route returns `500` with a
  generic message that does not contain `Pbkdf2`.

### Results

| Suite | Result |
|---|---|
| `npm test` | 54/54 |
| `npm run test:cf` | 20/20 |
| `npm run test:cf:integration` | 140/140 |

### Live verification

After deployment, an unknown-email login was sent to the production Worker.
This forces the dummy PBKDF2 derivation at the edge without changing data. It
returned the generic `401 Invalid email or password`, proving that 100,000
iterations derive successfully in the deployed runtime and that the raw error
is no longer exposed.

---

## 6. Prevention

1. **Platform policy limits are not reproduced by local emulation.** Any
   security parameter with a documented runtime ceiling must be verified in a
   deployed environment, not only in Node or `wrangler dev`.
2. **Keep a static guard.** The unit test fails if the constant exceeds 100,000.
3. **Treat the edge as the source of truth for KDF parameters.** Before raising
   a work factor, deploy a throwaway Worker and call the KDF at the target
   value.
4. **Never render `e.message` from unexpected server errors.** Only `ApiError`
   messages are user-facing; everything else is logged and replaced with a
   generic response.

---

## 7. Residual risk

100,000 PBKDF2-SHA256 iterations is below OWASP's current 600,000
recommendation. It is the maximum Cloudflare Workers supports today. Options for
stronger offline-cracking resistance, if required later:

- apply a server-side pepper before PBKDF2, stored as a Worker secret, so a
  database-only breach cannot verify guesses;
- move password verification to a runtime or service without the 100,000 cap;
- re-evaluate when Cloudflare's raised default (workerd PR #7550) is confirmed
  live on the production edge.

None of these should be implemented without a migration plan for existing
hashes and a deployed-runtime test.

---

## 8. References

- Cloudflare Web Crypto documentation: https://developers.cloudflare.com/workers/runtime-apis/web-crypto
- workerd PBKDF2 limit discussion: https://github.com/cloudflare/workerd/issues/1346
- workerd PR to raise the default cap: https://github.com/cloudflare/workerd/pull/7550
- Cloudflare Community confirmation of the 100,000 limit: https://community.cloudflare.com/t/web-crypto-api-derivekey-issues/474035
- Code: `worker/auth.js`, `worker/index.js`, `tests/cf-unit.test.cjs`, `tests/cf-integration.cjs`
