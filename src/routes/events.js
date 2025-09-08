const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin"); // Middleware to check for admin role
const eventController = require("../controllers/eventController");

// --- PUBLIC & USER ROUTES ---

// GET /api/events: Get all events.
// If user is admin, they see all events. If not, they only see 'published' events.
router.get("/", auth, eventController.getEvents);

// GET /api/events/:id: Get a single event by its ID.
router.get("/:id", eventController.getEventById);

// POST /api/events/:id/register: A logged-in user registers for an event.
router.post("/:id/register", auth, eventController.registerEvent);

// POST /api/events/:id/unregister: A logged-in user unregisters from an event.
router.post("/:id/unregister", auth, eventController.unregisterEvent);

// --- ADMIN-ONLY PROTECTED ROUTES ---
// The [auth, admin] array ensures the user is both logged in AND has the 'admin' role.

// POST /api/events: Create a new event.
router.post("/", [auth, admin], eventController.createEvent);

// PUT /api/events/:id: Update an existing event.
router.put("/:id", [auth, admin], eventController.updateEvent);

// DELETE /api/events/:id: Delete an event.
router.delete("/:id", [auth, admin], eventController.deleteEvent);

// POST /api/events/:id/duplicate: Create a copy of an event.
router.post("/:id/duplicate", [auth, admin], eventController.duplicateEvent);
// router.get('/list', [auth, admin], async (req, res) => {
//     try {
//         const events = await Event.find().select('title').sort({ date: -1 });
//         res.json(events);
//     } catch (err) {
//         res.status(500).send('Server Error');
//     }
// });

module.exports = router;
