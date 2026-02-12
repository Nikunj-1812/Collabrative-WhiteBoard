const express = require("express");
const auth = require("../middlewares/auth");
const controller = require("../controllers/boardController");

const router = express.Router();

router.use(auth);
router.get("/", controller.listBoards);
router.post("/", controller.createBoard);
router.get("/:id", controller.getBoard);
router.put("/:id", controller.updateBoard);
router.delete("/:id", controller.deleteBoard);

module.exports = router;
