// server/auth.js — register/login + Google account linking + JWT middleware
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const configuredSecret = String(process.env.JWT_SECRET || "").trim();
if (configuredSecret && (configuredSecret.length < 32 || [
  "popforge-dev-secret-change-in-prod", "change-me-to-a-long-random-string"
].includes(configuredSecret))) {
  throw new Error("JWT_SECRET must be a unique random secret of at least 32 characters");
}
if (!configuredSecret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production");
}
// Local development can start without configuration; tokens expire on restart.
const JWT_SECRET = configuredSecret || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRES = "30d";

function signToken(user) {
  const row = db.prepare("SELECT token_version FROM users WHERE id = ?").get(user.id);
  if (!row) throw new Error("Account not found");
  return jwt.sign({ userId: user.id, email: user.email, tokenVersion: row.token_version }, JWT_SECRET, { expiresIn: JWT_EXPIRES, algorithm: "HS256", jwtid: crypto.randomUUID() });
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

function getUserById(id) {
  const row = db.prepare("SELECT id, email, name, avatar_url, google_id, password_hash FROM users WHERE id = ?").get(id);
  return row ? publicUser(row) : null;
}

function updateProfile(userId, patch) {
  patch = patch || {};
  let name = String(patch.name || "").trim().slice(0, 60);
  let avatarUrl = String(patch.avatarUrl || "").trim().slice(0, 500);
  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) avatarUrl = "";
  db.prepare("UPDATE users SET name = ?, avatar_url = ? WHERE id = ?").run(name || null, avatarUrl || null, userId);
  return getUserById(userId);
}

function register(email, password, name) {
  email = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid email address");
  if (typeof password !== "string" || !password) throw new Error("Email and password are required");
  if (Buffer.byteLength(password, "utf8") > 72) throw new Error("Password must be at most 72 UTF-8 bytes");
  if (password.length < 12) throw new Error("Password must be at least 12 characters");
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) throw new Error("An account with that email already exists");
  const hash = bcrypt.hashSync(password, 10);
  name = String(name || "").trim().slice(0, 60);
  const info = db.prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)").run(email, hash, name || null);
  const user = { id: info.lastInsertRowid, email, name: name || null, avatarUrl: null };
  return { user, token: signToken(user) };
}

// Failing logins still perform one bcrypt comparison. Without this, a missing
// or Google-only account returned before the hash work and its faster response
// disclosed which emails are registered. Generated once per process.
let dummyHash = null;
function dummyPasswordHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);
  return dummyHash;
}

function login(email, password) {
  email = String(email || "").trim().toLowerCase();
  const row = db.prepare("SELECT id, email, name, avatar_url, password_hash, google_id FROM users WHERE email = ?").get(email);
  const passwordString = typeof password === "string" ? password : "";
  const canMatch = !!row && !row.google_id && typeof password === "string"
    && Buffer.byteLength(passwordString, "utf8") <= 72;
  // Google-only accounts get a random, unusable hash; a dummy hash covers
  // unknown emails. Both still pay the same comparison cost before failing.
  const valid = bcrypt.compareSync(passwordString, canMatch ? row.password_hash : dummyPasswordHash());
  if (!canMatch || !valid) throw new Error("Invalid email or password");
  const user = { id: row.id, email: row.email, name: row.name || null, avatarUrl: row.avatar_url || null };
  return { user, token: signToken(user) };
}

/**
 * Find or create the local account behind a verified Google identity.
 * - Known google_id  -> reuse that account (Google is the source of truth for name/avatar).
 * - Same email       -> link Google to the existing password account (no duplicate shelf).
 * - Otherwise        -> create a Google-only account with a random password hash so
 *                       password login can never succeed for it.
 */
function findOrCreateGoogleUser(profile) {
  if (profile.emailVerified !== true) throw new Error("A verified Google email is required");
  const sub = String(profile.sub || "").trim();
  const email = String(profile.email || "").trim().toLowerCase();
  const name = profile.name ? String(profile.name).trim().slice(0, 80) : null;
  const avatar = profile.picture ? String(profile.picture).trim().slice(0, 500) : null;

  if (!sub) throw new Error("Google did not return an account id");
  if (!email) throw new Error("Google did not return an email address");

  let row = db.prepare("SELECT * FROM users WHERE google_id = ?").get(sub);

  if (row) {
    if (name || avatar) {
      db.prepare("UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?")
        .run(name, avatar, row.id);
      row = db.prepare("SELECT * FROM users WHERE id = ?").get(row.id);
    }
  } else {
    row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (row) {
      if (row.google_id && row.google_id !== sub) throw new Error("Email belongs to a different Google account");
      // A historical verification of a third-party address does not prove current ownership.
      if (!email.endsWith("@gmail.com") && !(typeof profile.hostedDomain === "string" && profile.hostedDomain.trim())) {
        throw new Error("Sign in with your existing email and password. Google cannot verify current ownership of this email for account linking.");
      }
      // Verified email ownership replaces unverified credentials and revokes prior sessions.
      const unusableHash = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);
      db.prepare("UPDATE users SET google_id = ?, password_hash = ?, token_version = token_version + 1, name = COALESCE(name, ?), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?")
        .run(sub, unusableHash, name, avatar, row.id);
      row = db.prepare("SELECT * FROM users WHERE id = ?").get(row.id);
    } else {
      const randomHash = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);
      const info = db.prepare(
        "INSERT INTO users (email, password_hash, google_id, name, avatar_url) VALUES (?, ?, ?, ?, ?)"
      ).run(email, randomHash, sub, name, avatar);
      row = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    }
  }

  const user = publicUser(row);
  return { user, token: signToken(user) };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (!Number.isSafeInteger(payload.userId) || !Number.isSafeInteger(payload.exp)) throw new Error("Invalid account");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (db.prepare("SELECT token_hash FROM revoked_tokens WHERE token_hash = ?").get(tokenHash)) throw new Error("Revoked session");
    req.session = { tokenHash, expiresAt: payload.exp };
    const row = db.prepare("SELECT id, email, token_version FROM users WHERE id = ?").get(payload.userId);
    if (!row || (payload.tokenVersion === undefined ? 0 : payload.tokenVersion) !== row.token_version) throw new Error("Revoked session");
    req.user = { id: row.id, email: row.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { register, login, findOrCreateGoogleUser, getUserById, updateProfile, authMiddleware, signToken };

async function manageAccount(id, body) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!row) throw new Error("Account not found");
  if (row.google_id) {
    const profile = await require('./google').verifyCredential(body.credential);
    if (profile.sub !== row.google_id) throw new Error("Verify with the Google account linked to this account");
  } else {
    if (typeof body.currentPassword !== 'string' || Buffer.byteLength(body.currentPassword)>72 || !bcrypt.compareSync(body.currentPassword,row.password_hash)) throw new Error("Current password is incorrect");
  }
  if (body.action === 'password') {
    if(row.google_id) throw new Error("This account uses Google sign-in. Manage its password with Google.");
    if(typeof body.newPassword!=='string'||body.newPassword.length<12||Buffer.byteLength(body.newPassword)>72)throw new Error("New password must be 12 characters or more and at most 72 UTF-8 bytes");
    db.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?").run(bcrypt.hashSync(body.newPassword,10),id);
  } else if(body.action === 'delete') {
    if(body.confirmation!==row.email)throw new Error("Type your account email to confirm deletion");
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  } else throw new Error("Invalid account action");
  return {ok:true};
}
module.exports.manageAccount = manageAccount;
