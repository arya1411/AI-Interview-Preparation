const rateLimit = require("express-rate-limit");

const formatRetryAfter = (req) => {
  const resetTime = req.rateLimit?.resetTime;
  if (!resetTime) return undefined;

  const retrySeconds = Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000));
  return retrySeconds;
};

const createLimiter = ({ windowMs, max, message, keyGenerator, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator,
    handler: (req, res) => {
      const retryAfter = formatRetryAfter(req);
      if (retryAfter) {
        res.set("Retry-After", String(retryAfter));
      }

      return res.status(429).json({
        success: false,
        message,
        retryAfter,
      });
    },
  });

const userOrIpKey = (req) => {
  const userId = req.user?._id?.toString();
  return userId ? `user:${userId}` : `ip:${req.ip}`;
};

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: "Too many API requests. Please try again in a few minutes.",
});

const loginLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Too many login attempts. Please wait before trying again.",
  skipSuccessfulRequests: true,
});

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: "Too many sign-up attempts from this network. Please try again later.",
});

const aiBurstLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 8,
  message: "Too many AI requests in a short time. Please wait a moment and retry.",
  keyGenerator: userOrIpKey,
});

const aiDailyLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: 120,
  message: "Daily AI quota reached. Please continue tomorrow.",
  keyGenerator: userOrIpKey,
});

module.exports = {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  aiBurstLimiter,
  aiDailyLimiter,
};
