const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");
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
  "http://127.0.0.1:3002",
  "http://localhost:3003",
  "http://127.0.0.1:3003",
  "http://localhost:3004",
  "http://127.0.0.1:3004"
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: Array.from(allowedOrigins),
    methods: ["GET", "POST"]
  }
});

// Make io accessible to routes
app.set('io', io);
app.use("/api/boards", boardRoutes);

io.on("connection", (socket) => {
  registerBoardSocket(io, socket);
});

// Serve Next.js frontend static export in production
if (process.env.NODE_ENV === "production") {
  const frontendDir = path.join(__dirname, "../frontend/out");
  // Serve static files
  app.use(express.static(frontendDir));
  // Catch-all: serve index.html for client-side routing
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"), (err) => {
      if (err) {
        res.status(404).json({ error: "Not found" });
      }
    });
  });
}

server.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

