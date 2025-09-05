// src/routes/events.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // Auth middleware
const eventController = require("../controllers/eventController");

// @route   GET api/events
// @desc    Get all events
// @access  Public
router.get("/", eventController.getEvents);

// @route   GET api/events/:id
// @desc    Get event by ID
// @access  Public
router.get("/:id", eventController.getEventById);

// @route   POST api/events
// @desc    Create an event
// @access  Private
router.post("/", auth, eventController.createEvent);

// @route   PUT api/events/:id
// @desc    Update an event
// @access  Private
router.put("/:id", auth, eventController.updateEvent);

// @route   DELETE api/events/:id
// @desc    Delete an event
// @access  Private
router.delete("/:id", auth, eventController.deleteEvent);

// @route   POST api/events/:id/register
// @desc    Register for an event
// @access  Private
router.post("/:id/register", auth, eventController.registerEvent);

// @route   POST api/events/:id/unregister
// @desc    Unregister from an event
// @access  Private
router.post("/:id/unregister", auth, eventController.unregisterEvent);

module.exports = router;
