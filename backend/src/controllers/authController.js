const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { JWT_SECRET } = require("../config/env");
const User = require("../models/User");

const signToken = (user) =>
  jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "12h" });

const signup = async (req, res) => {
  const { name, email, password } = req.body;
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const rawPassword = typeof password === "string" ? password : "";

  if (!trimmedName) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (rawPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await User.findOne({ email: trimmedEmail });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const user = await User.create({ name: trimmedName, email: trimmedEmail, passwordHash });
  const token = signToken(user);

  return res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email },
    token
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const rawPassword = typeof password === "string" ? password : "";

  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (!rawPassword) {
    return res.status(400).json({ error: "Password is required" });
  }

  const user = await User.findOne({ email: trimmedEmail });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(rawPassword, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  return res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token
  });
};

module.exports = {
  signup,
  login
};
