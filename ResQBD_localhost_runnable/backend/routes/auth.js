// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const { handleDbError } = require("../lib/errors");
const { hashPassword, verifyPassword, signToken, verifyToken } = require("../lib/auth");

const ORG_TYPES = [
  "Government Agency", "NGO", "Volunteer Organization",
  "Medical Organization", "International Aid Organization",
];

// POST /api/auth/register
// Two account types:
//   Organization — either joins an EXISTING organization (organization_id)
//                  or creates a brand new one (new_organization_name +
//                  new_organization_type)
//   Individual   — a personal/donor account, no organization attached
router.post("/register", async (req, res) => {
  const {
    user_id, password, account_type, display_name,
    organization_id, new_organization_name, new_organization_type,
  } = req.body;

  if (!user_id || !password || !account_type || !display_name) {
    return res.status(400).json({ error: "VALIDATION", message: "User ID, password, account type, and display name are all required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "VALIDATION", message: "Password must be at least 6 characters." });
  }
  if (!["Organization", "Individual"].includes(account_type)) {
    return res.status(400).json({ error: "VALIDATION", message: "account_type must be Organization or Individual." });
  }
  if (account_type === "Organization" && !organization_id && !(new_organization_name && new_organization_type)) {
    return res.status(400).json({ error: "VALIDATION", message: "Select an existing organization, or provide a name and type for a new one." });
  }
  if (new_organization_type && !ORG_TYPES.includes(new_organization_type)) {
    return res.status(400).json({ error: "VALIDATION", message: "Not a recognized organization type." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let orgId = null;
    if (account_type === "Organization") {
      if (organization_id) {
        orgId = organization_id;
      } else {
        const [result] = await conn.query(
          "INSERT INTO Organization (org_name, org_type) VALUES (?, ?)",
          [new_organization_name, new_organization_type]
        );
        orgId = result.insertId;
      }
    }

    const passwordHash = hashPassword(password);
    await conn.query(
      "INSERT INTO Users (user_id, password_hash, account_type, organization_id, display_name) VALUES (?, ?, ?, ?, ?)",
      [user_id, passwordHash, account_type, orgId, display_name]
    );

    await conn.commit();

    const user = { user_id, account_type, display_name, organization_id: orgId };
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    await conn.rollback();
    if (err.errno === 1062) {
      return res.status(409).json({ error: "DUPLICATE", message: "That User ID is already taken — choose another." });
    }
    handleDbError(err, res);
  } finally {
    conn.release();
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { user_id, password } = req.body;
  if (!user_id || !password) {
    return res.status(400).json({ error: "VALIDATION", message: "User ID and password are required." });
  }
  try {
    const [[row]] = await pool.query("SELECT * FROM Users WHERE user_id = ?", [user_id]);
    if (!row || !verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Incorrect User ID or password." });
    }
    const user = {
      user_id: row.user_id, account_type: row.account_type,
      display_name: row.display_name, organization_id: row.organization_id,
    };
    res.json({ token: signToken(user), user });
  } catch (err) {
    handleDbError(err, res);
  }
});

// GET /api/auth/me — used by the frontend to confirm a stored token is still valid
router.get("/me", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const user = token && verifyToken(token);
  if (!user) return res.status(401).json({ error: "UNAUTHENTICATED", message: "Not logged in." });
  res.json({ user });
});

module.exports = router;
