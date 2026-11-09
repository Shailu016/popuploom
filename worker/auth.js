// worker/auth.js — Cloudflare Workers port of server/auth.js
// New passwords use WebCrypto PBKDF2-SHA256; legacy bcrypt upgrades on login.
// (crypto.subtle is exempt from CPU metering). JWTs and Google verification use jose.
const { SignJWT, jwtVerify, createRemoteJWKSet } = require("jose");
const verifyShared = require("../shared/email-verification");

const GOOGLE_ISSUER = "https://accounts.google.com";
const GOOGLE_CERTS = new URL("https://www.googleapis.com/oauth2/v3/certs");
const JWT_EXPIRES = "30d";
const PBKDF2_ITERATIONS = 600000;

class ApiError extends Error {
  constructor(status, message, code, headers) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

function bufB64(buf) {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s);
}

function b64Buf(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function deriveKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, 256);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  return "pbkdf2$" + PBKDF2_ITERATIONS + "$" + bufB64(salt) + "$" + bufB64(new Uint8Array(bits));
}

async function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  if (/^\$2[aby]\$/.test(stored)) return require("bcryptjs").compare(password, stored);
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false; // legacy hashes are not verifiable here
  const iterations = Number(parts[1]);
  if (!Number.isSafeInteger(iterations) || iterations < 10000 || iterations > 1000000) return false;
  const salt = b64Buf(parts[2]), expected = b64Buf(parts[3]);
  if (salt.length < 8 || expected.length !== 32) return false;
  const actual = new Uint8Array(await deriveKey(password, salt, iterations));
  return timingSafeEqual(actual, expected);
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Every Worker environment requires a stable configured signing secret.
function secretKey(env) {
  const configured = String(env.JWT_SECRET || "").trim();
  if (configured.length < 32 || ["popforge-dev-secret-change-in-prod", "change-me-to-a-long-random-string"].includes(configured)) throw new ApiError(500, "Configure a unique JWT_SECRET of at least 32 characters");
  return new TextEncoder().encode(configured);
}

async function signToken(env, user) {
  const row = await env.DB.prepare("SELECT token_version FROM users WHERE id = ?").bind(user.id).first();
  if (!row) throw new ApiError(401, "Account not found");
  return new SignJWT({ userId: user.id, email: user.email, tokenVersion: row.token_version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .setJti(crypto.randomUUID())
    .sign(secretKey(env));
}

// The only user fields that are ever sent to a browser.
function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name || null,
    avatarUrl: row.avatar_url || null
  };
}

async function getUserById(env, id) {
  const row = await env.DB.prepare("SELECT id, email, name, avatar_url, google_id, password_hash FROM users WHERE id = ?").bind(id).first();
  return row ? publicUser(row) : null;
}

async function updateProfile(env, userId, patch) {
  patch = patch || {};
  let name = String(patch.name || "").trim().slice(0, 60);
  let avatarUrl = String(patch.avatarUrl || "").trim().slice(0, 500);
  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) avatarUrl = "";
  await env.DB.prepare("UPDATE users SET name = ?, avatar_url = ? WHERE id = ?").bind(name || null, avatarUrl || null, userId).run();
  return getUserById(env, userId);
}

async function register(env, email, password, name) {
  secretKey(env);
  email = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, "Enter a valid email address");
  if (typeof password !== "string" || !password) throw new ApiError(400, "Email and password are required");
  if (new TextEncoder().encode(password).length > 72) throw new ApiError(400, "Password must be at most 72 UTF-8 bytes");
  if (password.length < 12) throw new ApiError(400, "Password must be at least 12 characters");
  if (verificationRequired(env)) await ensureVerificationSchema(env);
  const existing = await env.DB.prepare("SELECT id, email FROM users WHERE email = ?").bind(email).first();
  // F-15: always derive the key before branching so response timing does not
  // disclose whether an account already exists for the given address.
  const hash = await hashPassword(password);
  if (existing) {
    if (!verificationRequired(env)) throw new ApiError(400, "An account with that email already exists");
    // Same generic response as a new signup. The route sends a notification
    // email; no account is created and no session is issued.
    return { ok: true, verificationRequired: true, existing: true, to: existing.email || email };
  }
  name = String(name || "").trim().slice(0, 60);
  const verified = verificationRequired(env) ? 0 : 1;
  const info = await env.DB.prepare("INSERT INTO users (email, password_hash, name, email_verified) VALUES (?, ?, ?, ?)")
    .bind(email, hash, name || null, verified).run();
  const user = { id: info.meta.last_row_id, email, name: name || null, avatarUrl: null };
  if (!verified) {
    // Verification is on: no session until the emailed link is opened.
    const token = randomVerifyToken();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare("DELETE FROM email_verification_tokens WHERE expires_at <= ?").bind(now).run();
    await env.DB.prepare("UPDATE email_verification_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(now, user.id).run();
    await env.DB.prepare("INSERT INTO email_verification_tokens (token_hash, user_id, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
      .bind(await sha256Hex(token), user.id, email, now, now + verifyShared.VERIFY_TOKEN_TTL_SECONDS).run();
    return { ok: true, verificationRequired: true, existing: false, to: email, token };
  }
  return { user, token: await signToken(env, user) };
}

function verificationRequired(env) {
  return String((env && env.REQUIRE_EMAIL_VERIFICATION) || "").trim().toLowerCase() === "true";
}

// D1 migrations are normally applied by wrangler, but the CI token used for
// deploys does not have D1 edit permission. This idempotent guard creates the
// same schema on first use, so verification can never crash on a database that
// has not been migrated yet. It runs at most once per isolate.
let verificationSchemaReady = false;
async function ensureVerificationSchema(env) {
  if (verificationSchemaReady) return;
  try {
    const info = await env.DB.prepare("PRAGMA table_info(users)").bind().all();
    const columns = (info && info.results ? info.results : info || []).map((c) => c.name);
    if (columns.indexOf("email_verified") === -1) {
      await env.DB.prepare("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1").bind().run();
    }
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS email_verification_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL, email TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER)").bind().run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_email_verification_expiry ON email_verification_tokens(expires_at)").bind().run();
    verificationSchemaReady = true;
  } catch (e) {
    // A concurrent isolate may have created the column first.
    if (/duplicate column/i.test(String(e && e.message))) {
      verificationSchemaReady = true;
      return;
    }
    throw e;
  }
}

function randomVerifyToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(verifyShared.VERIFY_TOKEN_BYTES));
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Consume a single-use signup verification token and sign the user in.
async function verifyEmail(env, rawToken) {
  secretKey(env);
  if (!verifyShared.isVerifyTokenFormat(rawToken)) throw new ApiError(400, verifyShared.INVALID_VERIFY_MESSAGE, verifyShared.INVALID_VERIFY_CODE);
  await ensureVerificationSchema(env);
  const now = Math.floor(Date.now() / 1000);
  const tokenHash = await sha256Hex(rawToken);
  const row = await env.DB.prepare("SELECT id, token_hash, user_id, email, expires_at, used_at FROM email_verification_tokens WHERE token_hash = ?").bind(tokenHash).first();
  if (!row || row.used_at != null || row.expires_at <= now) throw new ApiError(400, verifyShared.INVALID_VERIFY_MESSAGE, verifyShared.INVALID_VERIFY_CODE);
  const consumed = await env.DB.prepare("UPDATE email_verification_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ?").bind(now, row.id, now).run();
  if (!consumed.meta.changes) throw new ApiError(400, verifyShared.INVALID_VERIFY_MESSAGE, verifyShared.INVALID_VERIFY_CODE);
  await env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(row.user_id).run();
  const userRow = await env.DB.prepare("SELECT id, email, name, avatar_url FROM users WHERE id = ?").bind(row.user_id).first();
  if (!userRow) throw new ApiError(400, verifyShared.INVALID_VERIFY_MESSAGE, verifyShared.INVALID_VERIFY_CODE);
  const user = { id: userRow.id, email: userRow.email, name: userRow.name || null, avatarUrl: userRow.avatar_url || null };
  return { user, token: await signToken(env, user), message: verifyShared.VERIFY_SUCCESS_MESSAGE };
}

// Failing logins still perform one PBKDF2 verification. Without this, a missing
// or Google-only account returned before the key derivation and its faster
// response disclosed which emails are registered. Generated once per isolate.
let dummyHashPromise = null;
function dummyPasswordHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword(crypto.randomUUID());
  return dummyHashPromise;
}

async function login(env, email, password) {
  email = String(email || "").trim().toLowerCase();
  if (verificationRequired(env)) await ensureVerificationSchema(env);
  const row = await env.DB.prepare("SELECT id, email, name, avatar_url, password_hash, google_id, email_verified FROM users WHERE email = ?").bind(email).first();
  const passwordString = typeof password === "string" ? password : "";
  const canMatch = !!row && !row.google_id && typeof password === "string"
    && new TextEncoder().encode(passwordString).length <= 72;
  // Google-only accounts get a random, unusable hash; a dummy hash covers
  // unknown emails. Both still pay the same verification cost before failing.
  const stored = canMatch ? row.password_hash : await dummyPasswordHash();
  const valid = await verifyPassword(passwordString, stored);
  if (!canMatch || !valid) throw new ApiError(401, "Invalid email or password");
  if (verificationRequired(env) && Number(row.email_verified) === 0) {
    // Same response as a wrong password on purpose: a distinct 403 would let
    // an attacker learn that a freshly registered address was new.
    throw new ApiError(401, "Invalid email or password");
  }
  if (/^\$2[aby]\$/.test(row.password_hash)) {
    const upgraded = await hashPassword(password);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?").bind(upgraded, row.id, row.password_hash).run();
  } else if (String(row.password_hash).indexOf("pbkdf2$") === 0 && Number(String(row.password_hash).split("$")[1]) < PBKDF2_ITERATIONS) {
    // Rehash older PBKDF2 work factors after a successful login.
    const upgraded = await hashPassword(password);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?").bind(upgraded, row.id, row.password_hash).run();
  }
  const user = { id: row.id, email: row.email, name: row.name || null, avatarUrl: row.avatar_url || null };
  return { user, token: await signToken(env, user) };
}

// Same linking semantics as server/auth.js findOrCreateGoogleUser:
// known google_id reuses the account, same email links Google to the password
// account (only when ownership is provable), otherwise a Google-only account
// is created with a random password hash so password login can never succeed.
async function findOrCreateGoogleUser(env, profile) {
  secretKey(env);
  if (profile.emailVerified !== true) throw new ApiError(403, "A verified Google email is required", "EMAIL_UNVERIFIED");
  const sub = String(profile.sub || "").trim();
  const email = String(profile.email || "").trim().toLowerCase();
  const name = profile.name ? String(profile.name).trim().slice(0, 80) : null;
  const avatar = profile.picture ? String(profile.picture).trim().slice(0, 500) : null;

  if (!sub) throw new ApiError(401, "Google did not return an account id");
  if (!email) throw new ApiError(401, "Google did not return an email address");

  let row = await env.DB.prepare("SELECT * FROM users WHERE google_id = ?").bind(sub).first();

  if (row) {
    if (name || avatar) {
      await env.DB.prepare("UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?").bind(name, avatar, row.id).run();
      row = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(row.id).first();
    }
  } else {
    row = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (row) {
      if (row.google_id && row.google_id !== sub) throw new ApiError(401, "Email belongs to a different Google account");
      // A historical verification of a third-party address does not prove current ownership.
      if (!email.endsWith("@gmail.com") && !(typeof profile.hostedDomain === "string" && profile.hostedDomain.trim())) {
        throw new ApiError(401, "Sign in with your existing email and password. Google cannot verify current ownership of this email for account linking.");
      }
      // Verified email ownership replaces unverified credentials and revokes prior sessions.
      const unusableHash = await hashPassword(crypto.randomUUID());
      await env.DB.prepare("UPDATE users SET google_id = ?, password_hash = ?, token_version = token_version + 1, email_verified = 1, name = COALESCE(name, ?), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?")
        .bind(sub, unusableHash, name, avatar, row.id).run();
      row = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(row.id).first();
    } else {
      const randomHash = await hashPassword(crypto.randomUUID());
      const info = await env.DB.prepare("INSERT INTO users (email, password_hash, google_id, name, avatar_url, email_verified) VALUES (?, ?, ?, ?, ?, 1)")
        .bind(email, randomHash, sub, name, avatar).run();
      row = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(info.meta.last_row_id).first();
    }
  }

  const user = publicUser(row);
  return { user, token: await signToken(env, user) };
}

const googleJwks = createRemoteJWKSet(GOOGLE_CERTS); // instance caches Google's signing keys per isolate

/**
 * Verify the JWT credential that Google Identity Services hands the browser.
 * The token is signed by Google and pinned to our client id as its audience,
 * so a token minted for another site is rejected here. Returns the same
 * profile shape as server/google.js.
 */
async function verifyCredential(env, credential) {
  const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
  if (!clientId) throw new ApiError(503, "Google sign-in is not configured on this server. Add GOOGLE_CLIENT_ID to .env and restart.", "GOOGLE_NOT_CONFIGURED");
  if (typeof credential !== "string" || !credential || credential.length > 16384) throw new ApiError(400, "Missing Google credential", "BAD_REQUEST");

  let payload;
  try {
    ({ payload } = await jwtVerify(credential, googleJwks, { issuer: GOOGLE_ISSUER, audience: clientId }));
  } catch (e) {
    throw new ApiError(401, "Google sign-in failed. Please try again.", "BAD_TOKEN");
  }

  if (!payload.sub || !payload.email) throw new ApiError(401, "Google sign-in returned an incomplete account.", "BAD_TOKEN");
  if (payload.email_verified !== true) throw new ApiError(403, "That Google email is not verified, so it cannot be used to sign in.", "EMAIL_UNVERIFIED");

  return {
    sub: payload.sub,
    emailVerified: true,
    hostedDomain: typeof payload.hd === "string" ? payload.hd : null,
    email: String(payload.email).trim().toLowerCase(),
    name: payload.name || payload.given_name || "",
    picture: payload.picture || ""
  };
}

async function authMiddleware(env, request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Not authenticated");
  try {
    const { payload } = await jwtVerify(token, secretKey(env), { algorithms: ["HS256"] });
    if (!Number.isSafeInteger(payload.userId) || !Number.isSafeInteger(payload.exp)) throw new Error("Invalid account");
    const tokenHash = await sha256Hex(token);
    const revoked = await env.DB.prepare("SELECT token_hash FROM revoked_tokens WHERE token_hash = ?").bind(tokenHash).first();
    if (revoked) throw new Error("Revoked session");
    const row = await env.DB.prepare("SELECT id, email, token_version FROM users WHERE id = ?").bind(payload.userId).first();
    if (!row || (payload.tokenVersion === undefined ? 0 : payload.tokenVersion) !== row.token_version) throw new Error("Revoked session");
    return { user: { id: row.id, email: row.email }, tokenHash, expiresAt: payload.exp };
  } catch (e) {
    throw new ApiError(401, "Invalid or expired token");
  }
}

// Revoke the current bearer token server-side; other devices stay signed in.
async function revokeToken(env, session) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("DELETE FROM revoked_tokens WHERE expires_at <= ?").bind(now).run();
  await env.DB.prepare("INSERT OR REPLACE INTO revoked_tokens(token_hash, expires_at) VALUES (?, ?)").bind(session.tokenHash, session.expiresAt).run();
}

module.exports = {
  ApiError,
  register,
  login,
  findOrCreateGoogleUser,
  verifyCredential,
  getUserById,
  updateProfile,
  authMiddleware,
  signToken,
  revokeToken,
  hashPassword,
  sha256Hex,
  verifyEmail,
  verificationRequired
};

async function manageAccount(env, id, body) {
  const row = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  if (!row) throw new Error("Account not found");
  if (row.google_id) {
    const profile = await verifyCredential(env, body.credential);
    if (profile.sub !== row.google_id) throw new Error("Verify with the Google account linked to this account");
  } else {
    if (typeof body.currentPassword !== 'string' || new TextEncoder().encode(body.currentPassword).length>72 || !(await verifyPassword(body.currentPassword,row.password_hash))) throw new Error("Current password is incorrect");
  }
  if (body.action === 'password') {
    if(row.google_id) throw new Error("This account uses Google sign-in. Manage its password with Google.");
    if(typeof body.newPassword!=='string'||body.newPassword.length<12||new TextEncoder().encode(body.newPassword).length>72)throw new Error("New password must be 12 characters or more and at most 72 UTF-8 bytes");
    await env.DB.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?").bind(await hashPassword(body.newPassword),id).run();
  } else if(body.action === 'delete') {
    if(body.confirmation!==row.email)throw new Error("Type your account email to confirm deletion");
    // Explicitly remove dependent rows before the user row. This preserves the
    // privacy promise even if a restored database has cascades disabled.
    const owned = "SELECT id FROM widgets WHERE user_id = ?";
    await env.DB.prepare("DELETE FROM submissions WHERE widget_id IN (" + owned + ")").bind(id).run();
    await env.DB.prepare("DELETE FROM webhook_deliveries WHERE widget_id IN (" + owned + ")").bind(id).run();
    await env.DB.prepare("DELETE FROM webhook_endpoints WHERE widget_id IN (" + owned + ")").bind(id).run();
    await env.DB.prepare("DELETE FROM widgets WHERE user_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  } else throw new Error("Invalid account action");
  return {ok:true};
}
module.exports.manageAccount = manageAccount;
