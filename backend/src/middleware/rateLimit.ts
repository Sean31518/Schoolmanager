import rateLimit from "express-rate-limit";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // The in-memory store isn't reset between test files in the same
  // process, and legitimate test coverage of auth flows easily exceeds 20
  // register/login calls across a single suite run - this is a
  // production safeguard, not something a test suite should have to work
  // around.
  skip: () => process.env.NODE_ENV === "test",
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Zu viele Versuche. Bitte in ein paar Minuten erneut versuchen.",
    },
  },
});
