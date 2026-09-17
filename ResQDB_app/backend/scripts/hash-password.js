// backend/scripts/hash-password.js
// Generates a bcrypt hash to put in ADMIN_PASSWORD_HASH, so the real
// password never has to sit in an env var in plain text.
//
// Usage:
//   node scripts/hash-password.js "yourPasswordHere"
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.js <password>");
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log("\nAdd this to your backend environment variables:\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
});
