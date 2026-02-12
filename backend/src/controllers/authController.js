const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

const login = (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const user = { id: `user-${Date.now()}`, name };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "12h" });

  return res.json({ user, token });
};

module.exports = {
  login
};
