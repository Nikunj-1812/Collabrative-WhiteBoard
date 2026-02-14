require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 4000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  MONGO_URI: process.env.MONGO_URI || ""
};
