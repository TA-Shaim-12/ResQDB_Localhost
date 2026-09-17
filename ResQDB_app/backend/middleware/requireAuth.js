// backend/middleware/requireAuth.js
// Protects a route with a Bearer JWT issued by POST /api/auth/login.
const { verifyToken } = require("../lib/auth");

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Login required." });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Session expired — please log in again." });
  }
};
