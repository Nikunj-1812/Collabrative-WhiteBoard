const { v4: uuid } = require("uuid");

const boards = new Map();

const createBoard = ({ title, ownerId }) => {
  const board = {
    id: uuid(),
    title,
    ownerId,
    notes: [],
    paths: [],
    rects: [],
    texts: [],
    createdAt: new Date().toISOString()
  };
  boards.set(board.id, board);
  return board;
};

const listBoards = () => Array.from(boards.values());

const getBoard = (id) => boards.get(id);

const ensureBoard = (id) => {
  const existing = boards.get(id);
  if (existing) return existing;
  const board = {
    id,
    title: "Untitled Board",
    ownerId: "system",
    notes: [],
    paths: [],
    rects: [],
    texts: [],
    createdAt: new Date().toISOString()
  };
  boards.set(id, board);
  return board;
};

const updateBoard = (id, patch) => {
  const board = boards.get(id);
  if (!board) return null;
  const next = { ...board, ...patch };
  boards.set(id, next);
  return next;
};

const deleteBoard = (id) => boards.delete(id);

module.exports = {
  createBoard,
  listBoards,
  getBoard,
  ensureBoard,
  updateBoard,
  deleteBoard
};
