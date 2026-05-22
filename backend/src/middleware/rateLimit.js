/**
 * Simple in-memory rate limiter (per IP + route). Resets entries periodically.
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10, message = 'Too many requests. Try again later.' } = {}) {
  const hits = new Map();

  const prune = () => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  };

  const timer = setInterval(prune, windowMs);
  if (timer.unref) timer.unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - entry.start)) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ message });
    }
    return next();
  };
}

const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 15,
  message: 'Too many login or registration attempts. Please wait 15 minutes.',
});

module.exports = { createRateLimiter, authRateLimit };
