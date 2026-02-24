const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { JWT_SECRET } = require("../config/env");
const User = require("../models/User");

// In-memory store for password reset tokens (expires in 1 hour)
const resetTokens = new Map();

const signToken = (user) =>
  jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: "12h" });

const signup = async (req, res) => {
  try {
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

    console.log("[auth] User signed up successfully:", user.email);
    return res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (error) {
    console.error("[auth] Signup error:", error);
    return res.status(500).json({ error: "Signup failed. Please try again." });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const rawPassword = typeof password === "string" ? password : "";

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!rawPassword) {
      return res.status(400).json({ error: "Password is required" });
    }

    console.log("[auth] Attempting login with email:", trimmedEmail);
    const user = await User.findOne({ email: trimmedEmail });
    console.log("[auth] User found:", user ? "Yes" : "No");
    if (!user) {
      console.log("[auth] Login failed - user not found for email:", trimmedEmail);
      return res.status(401).json({ error: "Email or password is incorrect. Please try again." });
    }

    console.log("[auth] Comparing password for user:", user.email);
    const match = await bcrypt.compare(rawPassword, user.passwordHash);
    console.log("[auth] Password match result:", match);
    if (!match) {
      console.log("[auth] Login failed - password mismatch for email:", trimmedEmail);
      return res.status(401).json({ error: "Email or password is incorrect. Please try again." });
    }

    const token = signToken(user);
    console.log("[auth] User logged in successfully:", user.email);
    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (error) {
    console.error("[auth] Login error:", error);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ message: "If the email exists, a reset token has been generated" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 3600000; // 1 hour

    resetTokens.set(resetToken, {
      email: user.email,
      expiresAt
    });

    console.log("[auth] Password reset token generated for:", user.email);
    console.log("[auth] Reset token:", resetToken);
    
    // In production, you'd send this via email
    // For development, return it in response
    return res.json({ 
      message: "Reset token generated",
      resetToken, // Remove this in production
      expiresIn: "1 hour"
    });
  } catch (error) {
    console.error("[auth] Forgot password error:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Reset token is required" });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Verify token
    const tokenData = resetTokens.get(token);
    if (!tokenData) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    if (Date.now() > tokenData.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({ error: "Reset token has expired" });
    }

    // Find user and update password
    const user = await User.findOne({ email: tokenData.email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password using the User model method
    await User.updatePassword(tokenData.email, passwordHash);

    // Delete used token
    resetTokens.delete(token);

    console.log("[auth] Password reset successful for:", user.email);
    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("[auth] Reset password error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword
};
