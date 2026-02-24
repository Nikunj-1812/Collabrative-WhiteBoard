const boardStore = require("../models/boardStore");

const listBoards = (req, res) => {
  return res.json(boardStore.listBoards());
};

const createBoard = (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  const board = boardStore.createBoard({ title, ownerId: req.user.id });
  console.log(`[boardController] Board created: ${board.id}, title: ${board.title}`);
  return res.status(201).json(board);
};

const getBoard = (req, res) => {
  const board = boardStore.getBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: "Board not found" });
  }
  return res.json(board);
};

const updateBoard = (req, res) => {
  const board = boardStore.updateBoard(req.params.id, req.body);
  if (!board) {
    return res.status(404).json({ error: "Board not found" });
  }
  return res.json(board);
};

const deleteBoard = (req, res) => {
  const boardId = req.params.id;
  const removed = boardStore.deleteBoard(boardId);
  if (!removed) {
    return res.status(404).json({ error: "Board not found" });
  }
  
  // Emit socket event to kick all users from this board
  const io = req.app.get('io');
  if (io) {
    console.log(`[boardController] Board ${boardId} deleted, notifying all users`);
    io.to(boardId).emit("board:deleted", { boardId });
  }
  
  return res.status(204).send();
};

module.exports = {
  listBoards,
  createBoard,
  getBoard,
  updateBoard,
  deleteBoard
};
