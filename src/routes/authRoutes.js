const express = require("express");
const { signup, login, me, updateProfile } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.patch("/profile", authMiddleware, updateProfile);

module.exports = router;
