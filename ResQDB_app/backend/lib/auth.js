// backend/lib/auth.js
// Minimal auth helpers: sign/verify a JWT for the single admin account,
// and check a submitted password against either a bcrypt hash (preferred)
// or a plaintext fallback (fine for a class project, not for a real one).
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || "12h";

if (!process.env.JWT_SECRET) {
  console.warn(
    "[auth] JWT_SECRET is not set — using an insecure default. " +
      "Set JWT_SECRET in your environment before deploying publicly."
  );
}

function signToken(username) {
  return jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET); // throws if invalid/expired
}

async function checkPassword(plainPassword) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;
  if (hash) return bcrypt.compare(plainPassword, hash);
  if (plain) return plainPassword === plain;
  // No password configured at all — refuse every login rather than
  // silently accepting anything.
  return false;
}

module.exports = { signToken, verifyToken, checkPassword };
