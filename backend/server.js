const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { PORT, CLIENT_ORIGIN, MONGO_URI } = require("./src/config/env");
const authRoutes = require("./src/routes/authRoutes");
const boardRoutes = require("./src/routes/boardRoutes");
const { registerBoardSocket } = require("./src/sockets/boardSocket");

const app = express();
const allowedOrigins = new Set([
  CLIENT_ORIGIN,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002"
]);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json());

if (!MONGO_URI) {
  console.error("[server] MONGO_URI is not set. Auth will not work without a database connection.");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("[server] Connected to MongoDB");
    })
    .catch((error) => {
      console.error("[server] MongoDB connection error", error);
    });
}

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: Array.from(allowedOrigins),
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  registerBoardSocket(io, socket);
});

server.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
