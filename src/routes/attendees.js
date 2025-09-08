const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const attendeeController = require("../controllers/attendeeController");

// All routes in this file are for admins only
router.use(auth, admin);

router.get("/", attendeeController.getAttendees);
router.post("/", attendeeController.createAttendee);
router.put("/:id", attendeeController.updateAttendee);
router.delete("/:id", attendeeController.deleteAttendee);
router.patch("/:id/checkin", attendeeController.checkInAttendee);
router.post("/bulk-delete", attendeeController.bulkDeleteAttendees);

module.exports = router;
