// src/routes/profile.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const profileController = require("../controllers/profileController");

// @route   GET api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get("/me", auth, profileController.getProfile);

// @route   PUT api/profile/me
// @desc    Update user profile
// @access  Private
router.put("/me", auth, profileController.updateProfile);
router.get("/my-events", auth, profileController.getMyRegisteredEvents);
router.get("/dashboard-stats", auth, profileController.getUserDashboardStats);

module.exports = router;
