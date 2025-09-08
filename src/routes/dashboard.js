const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const dashboardController = require("../controllers/dashboardController");

// @route   GET api/dashboard/stats
// @desc    Get key statistics for the admin dashboard
// @access  Private (Admin only)
router.get("/stats", [auth, admin], dashboardController.getDashboardStats);

module.exports = router;
