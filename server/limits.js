// Bounded counters; forwarded addresses are resolved by Express's configured proxy policy.
const buckets = new Map();
function rateLimit(scope, max, windowMs) {
  return (req, res, next) => {
    const now = Date.now(), key = scope + ":" + (req.ip || req.socket.remoteAddress || "local");
    let bucket = buckets.get(key);
    if (!bucket || bucket.until <= now) {
      if (buckets.size >= 10000) {
        for (const [k, v] of buckets) if (v.until <= now) buckets.delete(k);
        if (buckets.size >= 10000) return res.status(429).json({ error: "Too many requests. Try again later." });
      }
      bucket = { count: 0, until: now + windowMs };
      buckets.set(key, bucket);
    }
    if (++bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.until - now) / 1000)));
      return res.status(429).json({ error: "Too many requests. Try again later." });
    }
    next();
  };
}
module.exports = rateLimit;
