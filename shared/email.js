// shared/email.js — provider-independent reset-email rendering plus the default
// Resend adapter. Both Express and the Worker call the same functions, so the
// message body and configuration checks cannot drift.
//
// Resend free plan: 3,000 emails/month and 100/day. The sending domain must be
// verified (SPF + DKIM) before production mail is accepted; see README.md and
// CLOUDFLARE.md. Tests replace sendPasswordResetEmail with a local stub and
// never make a provider request.
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const { RESET_TOKEN_TTL_MINUTES } = require("./password-reset");

function addressOf(from) {
  const match = /<([^<>]+)>\s*$/.exec(String(from || "").trim());
  return (match ? match[1] : String(from || "")).trim();
}

// Only HTTPS links are emailed, except plain localhost for local development.
function normalizeOrigin(raw) {
  let url;
  try { url = new URL(String(raw || "").trim()); } catch (e) { return null; }
  if (url.protocol === "https:") return url.origin;
  if (url.protocol === "http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname)) return url.origin;
  return null;
}

function readConfig(env, fallbackOrigin) {
  const apiKey = String((env && env.RESEND_API_KEY) || "").trim();
  const from = String((env && env.RESET_EMAIL_FROM) || "").trim();
  const origin = normalizeOrigin(String((env && env.PUBLIC_ORIGIN) || "").trim() || fallbackOrigin || "");
  const problems = [];
  if (!apiKey) problems.push("RESEND_API_KEY");
  if (!from) problems.push("RESET_EMAIL_FROM");
  else if (from.length > 320 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(addressOf(from))) {
    problems.push("RESET_EMAIL_FROM (use a verified sender such as PopupLoom <reset@popuploom.com>)");
  }
  if (!origin) problems.push("PUBLIC_ORIGIN (an https origin, or http://localhost for local development)");
  return { apiKey, from, origin, configured: problems.length === 0, problems };
}

function setupMessage(config) {
  const missing = config && config.problems && config.problems.length
    ? config.problems.join(", ")
    : "RESEND_API_KEY and RESET_EMAIL_FROM";
  return "Password reset email is not configured on this server. Set " + missing + ", then restart.";
}

function buildResetUrl(origin, token) {
  return String(origin).replace(/\/+$/, "") + "/reset-password.html#token=" + encodeURIComponent(token);
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderResetEmail({ resetUrl }) {
  const minutes = RESET_TOKEN_TTL_MINUTES;
  const subject = "Reset your PopupLoom password";
  const text = [
    "Someone requested a password reset for your PopupLoom account.",
    "",
    "Open this link to choose a new password. It expires in " + minutes + " minutes and can be used once:",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email. Your password will not change."
  ].join("\n");
  const html = [
    '<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#0A0B10;color:#F5F5F7;font-family:system-ui,-apple-system,Segoe UI,sans-serif">',
    '<div style="max-width:520px;margin:0 auto;background:#13151D;border:1px solid #262A36;border-radius:14px;padding:28px">',
    '<p style="margin:0 0 18px;font-size:18px;font-weight:600">Reset your PopupLoom password</p>',
    '<p style="margin:0 0 20px;line-height:1.6;color:#C9CCD6">Someone requested a password reset for your account. Choose a new password with the link below. It expires in ' + minutes + ' minutes and can be used once.</p>',
    '<p style="margin:0 0 22px"><a href="' + escapeHtml(resetUrl) + '" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#FF6A1F;color:#1A1005;font-weight:700;text-decoration:none">Reset your password</a></p>',
    '<p style="margin:0 0 8px;font-size:12px;color:#9DA0AC">If the button does not work, paste this link into your browser:</p>',
    '<p style="margin:0 0 20px;font-size:12px;color:#9DA0AC;word-break:break-all">' + escapeHtml(resetUrl) + '</p>',
    '<p style="margin:0;font-size:12px;color:#9DA0AC">If you did not request this, you can ignore this email. Your password will not change. PopupLoom will never email you a password.</p>',
    '</div></body></html>'
  ].join("");
  return { subject, text, html };
}

async function sendPasswordResetEmail(config, { to, token }) {
  const resetUrl = buildResetUrl(config.origin, token);
  const message = renderResetEmail({ resetUrl });
  const signal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(10000)
    : undefined;
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.from,
      to: [to],
      subject: message.subject,
      text: message.text,
      html: message.html
    }),
    signal
  });
  if (!response.ok) {
    // Never include the recipient, token or response body in the error.
    throw new Error("Email provider rejected the reset message (status " + response.status + ")");
  }
  return { ok: true };
}

module.exports = {
  RESEND_ENDPOINT,
  addressOf,
  normalizeOrigin,
  readConfig,
  setupMessage,
  buildResetUrl,
  renderResetEmail,
  sendPasswordResetEmail
};
