const boardStore = require("../models/boardStore");

const presenceByBoard = new Map();
const userBoardMap = new Map(); // Track which board each socket is on
const boardLeaders = new Map(); // Track the leader (first user) for each board

// Clear presence on startup
presenceByBoard.clear();

const getPresenceMap = (boardId) => {
  if (!presenceByBoard.has(boardId)) {
    presenceByBoard.set(boardId, new Map());
  }
  return presenceByBoard.get(boardId);
};

const registerBoardSocket = (io, socket) => {
  console.log("[boardSocket] New socket connection:", socket.id);

  socket.on("board:join", ({ boardId, user }) => {
    console.log(`[JOIN] User ${user.id} joining board ${boardId}`);
    socket.join(boardId);
    const board = boardStore.ensureBoard(boardId);

    // Store which board this socket is on
    userBoardMap.set(socket.id, { boardId, userId: user.id });

    // Set leader if this is the first user on this board
    if (!boardLeaders.has(boardId)) {
      boardLeaders.set(boardId, user.id);
      console.log(`[LEADER] User ${user.id} is now the leader of board ${boardId}`);
    }

    const presence = getPresenceMap(boardId);
    presence.set(user.id, {
      userId: user.id,
      name: user.name,
      color: user.color || "#38BDF8",
      position: { x: 0, y: 0 }
    });

    console.log(`[PRESENCE] Board ${boardId} now has ${presence.size} users`);

    // Send board data and leader info to the joining user
    socket.emit("board:sync", { 
      notes: board.notes || [],
      paths: board.paths || [],
      rects: board.rects || [],
      texts: board.texts || [],
      images: board.images || [],
      leaderId: boardLeaders.get(boardId)
    });

    // Send all existing cursors to the joining user
    for (const cursor of presence.values()) {
      socket.emit("presence:update", cursor);
    }

    // Broadcast the new user's presence to all other users in the board
    socket.to(boardId).emit("presence:update", {
      userId: user.id,
      name: user.name,
      color: user.color || "#38BDF8",
      position: { x: 0, y: 0 }
    });
  });

  socket.on("presence:cursor", ({ boardId, userId, position }) => {
    const presence = getPresenceMap(boardId);
    const existing = presence.get(userId);
    if (!existing) return;

    const updated = { ...existing, position };
    presence.set(userId, updated);
    socket.to(boardId).emit("presence:update", updated);
  });

  socket.on("presence:drawing", ({ boardId, userId, isDrawing }) => {
    const presence = getPresenceMap(boardId);
    const existing = presence.get(userId);
    if (!existing) return;

    const updated = { ...existing, isDrawing };
    presence.set(userId, updated);
    socket.to(boardId).emit("presence:drawing", { userId, isDrawing });
  });

  socket.on("board:note:create", ({ boardId, note }) => {
    const board = boardStore.ensureBoard(boardId);
    board.notes.push(note);
    boardStore.updateBoard(boardId, { notes: board.notes });
    socket.to(boardId).emit("board:note:created", note);
  });

  socket.on("board:note:update", ({ boardId, id, text, x, y }) => {
    console.log(`[boardSocket] Received note:update for ${id}:`, { text, x, y });
    const board = boardStore.ensureBoard(boardId);
    board.notes = board.notes.map((note) => {
      if (note.id === id) {
        const updated = { ...note };
        if (text !== undefined) updated.text = text;
        if (x !== undefined) updated.x = x;
        if (y !== undefined) updated.y = y;
        return updated;
      }
      return note;
    });
    boardStore.updateBoard(boardId, { notes: board.notes });
    
    // Find the updated note to broadcast the full object
    const updatedNote = board.notes.find(note => note.id === id);
    if (updatedNote) {
      console.log(`[boardSocket] Broadcasting updated note ${id}:`, updatedNote);
      socket.to(boardId).emit("board:note:updated", updatedNote);
    }
  });

  socket.on("board:note:delete", ({ boardId, id }) => {
    const board = boardStore.ensureBoard(boardId);
    board.notes = board.notes.filter((note) => note.id !== id);
    boardStore.updateBoard(boardId, { notes: board.notes });
    socket.to(boardId).emit("board:note:deleted", { id });
  });

  socket.on("board:path:delete", ({ boardId, id }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.paths) board.paths = [];
    board.paths = board.paths.filter((path) => path.id !== id);
    boardStore.updateBoard(boardId, { paths: board.paths });
    socket.to(boardId).emit("board:path:deleted", { id });
  });

  socket.on("board:path:create", ({ boardId, path }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.paths) board.paths = [];
    board.paths.push(path);
    boardStore.updateBoard(boardId, { paths: board.paths });
    console.log("[Backend] Broadcasting path:created to board", boardId, "path:", path.id);
    // Broadcast to ALL clients including sender
    io.to(boardId).emit("board:path:created", { path });
  });

  socket.on("board:path:update", ({ boardId, path }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.paths) board.paths = [];
    board.paths = board.paths.map((p) => (p.id === path.id ? path : p));
    boardStore.updateBoard(boardId, { paths: board.paths });
    console.log("[Backend] Broadcasting path:updated to board", boardId, "path:", path.id);
    // Broadcast to ALL clients including sender
    io.to(boardId).emit("board:path:updated", { path });
  });

  socket.on("board:rect:delete", ({ boardId, id }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.rects) board.rects = [];
    board.rects = board.rects.filter((rect) => rect.id !== id);
    boardStore.updateBoard(boardId, { rects: board.rects });
    socket.to(boardId).emit("board:rect:deleted", { id });
  });

  socket.on("board:rect:create", ({ boardId, rect }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.rects) board.rects = [];
    board.rects.push(rect);
    boardStore.updateBoard(boardId, { rects: board.rects });
    console.log("[Backend] Broadcasting rect:created to board", boardId, "rect:", rect.id);
    io.to(boardId).emit("board:rect:created", { rect });
  });

  socket.on("board:rect:update", ({ boardId, rect }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.rects) board.rects = [];
    board.rects = board.rects.map((r) => (r.id === rect.id ? rect : r));
    boardStore.updateBoard(boardId, { rects: board.rects });
    console.log("[Backend] Broadcasting rect:updated to board", boardId, "rect:", rect.id);
    io.to(boardId).emit("board:rect:updated", { rect });
  });

  socket.on("board:text:delete", ({ boardId, id }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.texts) board.texts = [];
    board.texts = board.texts.filter((text) => text.id !== id);
    boardStore.updateBoard(boardId, { texts: board.texts });
    socket.to(boardId).emit("board:text:deleted", { id });
  });

  socket.on("board:text:create", ({ boardId, text }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.texts) board.texts = [];
    board.texts.push(text);
    boardStore.updateBoard(boardId, { texts: board.texts });
    socket.to(boardId).emit("board:text:created", { text });
  });

  socket.on("board:image:create", ({ boardId, image }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.images) board.images = [];
    board.images.push(image);
    boardStore.updateBoard(boardId, { images: board.images });
    console.log("[Backend] Broadcasting image:created to board", boardId, "image:", image.id);
    io.to(boardId).emit("board:image:created", { image });
  });

  socket.on("board:image:update", ({ boardId, image }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.images) board.images = [];
    board.images = board.images.map((img) => (img.id === image.id ? image : img));
    boardStore.updateBoard(boardId, { images: board.images });
    console.log("[Backend] Broadcasting image:updated to board", boardId, "image:", image.id);
    io.to(boardId).emit("board:image:updated", { image });
  });

  socket.on("board:image:delete", ({ boardId, id }) => {
    const board = boardStore.ensureBoard(boardId);
    if (!board.images) board.images = [];
    board.images = board.images.filter((img) => img.id !== id);
    boardStore.updateBoard(boardId, { images: board.images });
    socket.to(boardId).emit("board:image:deleted", { id });
  });

  socket.on("board:clear", ({ boardId }) => {
    const board = boardStore.ensureBoard(boardId);
    board.notes = [];
    board.paths = [];
    board.rects = [];
    board.texts = [];
    board.images = [];
    boardStore.updateBoard(boardId, { notes: [], paths: [], rects: [], texts: [], images: [] });
    io.to(boardId).emit("board:cleared");
  });

  socket.on("board:leave", ({ boardId, userId }) => {
    socket.leave(boardId);
    const presence = getPresenceMap(boardId);
    presence.delete(userId);
    socket.to(boardId).emit("presence:leave", { userId });
    userBoardMap.delete(socket.id);
  });

  // Handle kicking a user from the board
  socket.on("board:kick-user", ({ boardId, userId }) => {
    console.log(`[KICK] Received kick request - User ${userId} from board ${boardId}`);
    const presence = getPresenceMap(boardId);
    console.log(`[KICK] Presence before delete: ${presence.size} users`);
    presence.delete(userId);
    console.log(`[KICK] Presence after delete: ${presence.size} users`);
    io.to(boardId).emit("presence:leave", { userId });
    io.to(boardId).emit("board:user-kicked", { userId });
    console.log(`[KICK] Broadcast complete`);
  });

  // Handle socket disconnect - clean up presence
  socket.on("disconnect", () => {
    const boardInfo = userBoardMap.get(socket.id);
    if (boardInfo) {
      const { boardId, userId } = boardInfo;
      console.log(`[DISCONNECT] User ${userId} disconnecting from board ${boardId}`);
      const presence = getPresenceMap(boardId);
      presence.delete(userId);
      console.log(`[PRESENCE] Board ${boardId} now has ${presence.size} users`);
      io.to(boardId).emit("presence:leave", { userId });
      userBoardMap.delete(socket.id);
    }
  });
};

module.exports = {
  registerBoardSocket
};
