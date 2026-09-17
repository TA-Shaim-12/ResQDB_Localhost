// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const { signToken, checkPassword } = require("../lib/auth");

// POST /api/auth/login
// Body: { username, password }
// There's a single admin account, configured entirely through environment
// variables (ADMIN_USERNAME + ADMIN_PASSWORD or ADMIN_PASSWORD_HASH).
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";

  if (!username || !password) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "Username and password are required." });
  }

  if (username !== expectedUsername) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid username or password." });
  }

  const ok = await checkPassword(password);
  if (!ok) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid username or password." });
  }

  const token = signToken(username);
  res.json({ token, username });
});

// GET /api/auth/me — lets the frontend confirm a stored token is still valid.
router.get("/me", require("../middleware/requireAuth"), (req, res) => {
  res.json({ username: req.user.sub });
});

module.exports = router;
