/**
 * Authentication.
 *
 * Login is fully implemented and the demo accounts are seeded, but the command-center
 * read routes are intentionally NOT gated yet — the login screen is deferred. Set
 * JWT_AUTH=true and mount `middleware/authMiddleware.js` on the read routers to
 * enforce it.
 */
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { get, all } = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "senticash-demo-secret";

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = get("SELECT * FROM users WHERE email = ?", [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

/** The four demo operators, so the login screen can be pointed at a known account. */
router.get("/auth/demo-accounts", (req, res) => {
  res.json(all("SELECT id, name, email, role FROM users WHERE email LIKE '%@demo.gov' ORDER BY id"));
});

module.exports = router;
