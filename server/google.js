// server/google.js — verify Google Identity Services ID tokens
const { OAuth2Client } = require("google-auth-library");

const CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
let client = null;

function isConfigured() {
  return !!CLIENT_ID;
}

function fail(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

/**
 * Verify the JWT credential that Google Identity Services hands the browser.
 * The token is signed by Google and pinned to our client id as its audience,
 * so a token minted for another site is rejected here.
 */
async function verifyCredential(credential) {
  if (!isConfigured()) {
    throw fail("GOOGLE_NOT_CONFIGURED", "Google sign-in is not configured on this server. Add GOOGLE_CLIENT_ID to .env and restart.");
  }
  if (!credential || typeof credential !== "string") {
    throw fail("BAD_REQUEST", "Missing Google credential");
  }
  if (!client) client = new OAuth2Client(CLIENT_ID);

  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken: credential, audience: CLIENT_ID });
  } catch (e) {
    throw fail("BAD_TOKEN", "Google sign-in failed. Please try again.");
  }

  const payload = ticket.getPayload() || {};
  if (!payload.sub || !payload.email) throw fail("BAD_TOKEN", "Google sign-in returned an incomplete account.");
  if (payload.email_verified !== true) {
    throw fail("EMAIL_UNVERIFIED", "That Google email is not verified, so it cannot be used to sign in.");
  }

  return {
    sub: payload.sub,
    emailVerified: true,
    email: String(payload.email).trim().toLowerCase(),
    name: payload.name || payload.given_name || "",
    picture: payload.picture || ""
  };
}

module.exports = { verifyCredential, isConfigured, CLIENT_ID };
