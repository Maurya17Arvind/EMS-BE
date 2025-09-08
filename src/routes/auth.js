// src/routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.patch("/reset-password/:token", authController.resetPassword);
router.post("/admin/login", authController.adminLogin);
router.post("/admin/create", authController.createAdmin);

module.exports = router;
