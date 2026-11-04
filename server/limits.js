// Bounded counters; forwarded addresses are resolved by Express's configured proxy policy.
// Email keys are hashed so a reset request cannot grow the table with addresses.
const crypto = require("crypto");
const shared = require("../shared/password-reset");

const buckets = new Map();

function consume(scope, subject, max, windowMs) {
  const now = Date.now(), key = scope + ":" + subject;
  let bucket = buckets.get(key);
  if (!bucket || bucket.until <= now) {
    if (buckets.size >= 10000) {
      for (const [k, v] of buckets) if (v.until <= now) buckets.delete(k);
      if (buckets.size >= 10000) return { limited: true, retryAfter: Math.ceil(windowMs / 1000) };
    }
    bucket = { count: 0, until: now + windowMs };
    buckets.set(key, bucket);
  }
  if (++bucket.count > max) {
    return { limited: true, retryAfter: Math.max(1, Math.ceil((bucket.until - now) / 1000)) };
  }
  return { limited: false };
}

function reject(res, result) {
  res.setHeader("Retry-After", String(result.retryAfter));
  return res.status(429).json({ error: "Too many requests. Try again later." });
}

function rateLimit(scope, max, windowMs) {
  return (req, res, next) => {
    const result = consume(scope, req.ip || req.socket.remoteAddress || "local", max, windowMs);
    if (result.limited) return reject(res, result);
    next();
  };
}

function emailSubject(email) {
  return "email:" + crypto.createHash("sha256").update(email).digest("hex");
}

// IP and normalized-email limiting run independently. A caller that only has
// the parsed body (after JSON parsing) can use checkEmailLimit directly.
function checkEmailLimit(scope, max, windowMs, email) {
  const normalized = shared.normalizeEmail(email);
  if (!shared.isValidEmail(normalized)) return { limited: false };
  return consume(scope, emailSubject(normalized), max, windowMs);
}

module.exports = rateLimit;
module.exports.rateLimit = rateLimit;
module.exports.checkEmailLimit = checkEmailLimit;
