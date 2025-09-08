// src/controllers/eventController.js
const mongoose = require("mongoose");
const Event = require("../models/Event");
const User = require("../models/User");

// GET all events with role-based filtering, search, and sorting
exports.getEvents = async (req, res) => {
  try {
    const query = {};
    const adminToken = req.header("x-auth-token"); // Assuming admin token is passed this way
    let isAdmin = false;

    // Check if the user making the request is an admin
    if (req.user && req.user.id) {
      const user = await User.findById(req.user.id);
      if (user && user.role === "admin") {
        isAdmin = true;
      }
    }

    // --- CRITICAL SECURITY & LOGIC ---
    if (isAdmin) {
      // Admins can filter by any status
      if (req.query.status && req.query.status !== "all") {
        query.status = req.query.status;
      }
    } else {
      // Regular users or guests can ONLY see 'published' events.
      query.status = "published";
    }

    // Search functionality (applies to both admins and users)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
      ];
    }

    // Category filter (applies to both admins and users)
    if (req.query.category && req.query.category !== "all") {
      query.category = req.query.category;
    }

    // Admins get all events, sorted by creation date. Users get published events.
    const events = await Event.find(query).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// GET a single event by ID
exports.getEventById = async (req, res) => {
  /* ... (no changes needed from previous version) ... */
};

// CREATE a new event (Admin Only)
exports.createEvent = async (req, res) => {
  try {
    const newEvent = new Event({ ...req.body, user: req.user.id });
    const event = await newEvent.save();
    res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// UPDATE an event (Admin Only)
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.user.toString() !== req.user.id)
      return res.status(401).json({ msg: "Not authorized" });

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(updatedEvent);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// DELETE an event (Admin Only)
exports.deleteEvent = async (req, res) => {
  try {
    // This is the most efficient and secure way to delete.
    // It finds a document that matches BOTH the event's _id AND the currently logged-in user's id.
    // If the event exists but the user isn't the owner, it will find nothing and return null.
    const event = await Event.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    // If 'event' is null, it means no document was found that matched BOTH criteria.
    // This handles two cases at once:
    // 1. The event ID doesn't exist.
    // 2. The event ID exists, but the user is not the owner (not authorized).
    if (!event) {
      return res.status(404).json({ msg: 'Event not found or user not authorized' });
    }

    // Optional but good practice: If the event is deleted, remove it from any user's "registeredEvents" list.
    // This prevents having dangling references in your user documents.
    await User.updateMany(
      { 'registeredEvents.event': req.params.id },
      { $pull: { registeredEvents: { event: req.params.id } } }
    );

    res.json({ msg: 'Event removed successfully' });
  } catch (err) {
    console.error(err.message);
    // This handles cases where the provided ID is not a valid MongoDB ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
};

// DUPLICATE an event (Admin Only)
exports.duplicateEvent = async (req, res) => {
  try {
    const originalEvent = await Event.findById(req.params.id);
    if (!originalEvent) return res.status(404).json({ msg: "Event not found" });

    const newEventData = {
      ...originalEvent.toObject(),
      _id: new mongoose.Types.ObjectId(),
      title: `${originalEvent.title} (Copy)`,
      status: "draft",
      attendees: [],
      currentAttendees: 0,
      user: req.user.id,
      createdAt: new Date(),
    };
    delete newEventData.__v; // Remove version key

    const duplicatedEvent = new Event(newEventData);
    await duplicatedEvent.save();
    res.status(201).json(duplicatedEvent);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @route   POST api/events/:id/register
// @desc    Register for an event
// @access  Private
exports.registerEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const user = await User.findById(req.user.id);

    if (!event) {
      return res.status(404).json({ msg: "Event not found" });
    }
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if user is already registered
    if (
      event.attendees.some(
        (attendee) => attendee.user.toString() === req.user.id
      )
    ) {
      return res.status(400).json({ msg: "Already registered for this event" });
    }

    // Check capacity
    if (event.currentAttendees >= event.capacity) {
      return res.status(400).json({ msg: "Event is full" });
    }

    // Add user to event attendees
    event.attendees.unshift({ user: req.user.id });
    event.currentAttendees += 1;
    await event.save();

    // Add event to user's registered events
    user.registeredEvents.unshift({ event: event.id });
    await user.save();

    res.json({ msg: "Registered for event successfully", eventId: event.id });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Event not found" });
    }
    res.status(500).send("Server Error");
  }
};

// @route   POST api/events/:id/unregister
// @desc    Unregister from an event
// @access  Private
exports.unregisterEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const user = await User.findById(req.user.id);

    if (!event) {
      return res.status(404).json({ msg: "Event not found" });
    }
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if user is registered
    if (
      !event.attendees.some(
        (attendee) => attendee.user.toString() === req.user.id
      )
    ) {
      return res.status(400).json({ msg: "Not registered for this event" });
    }

    // Remove user from event attendees
    event.attendees = event.attendees.filter(
      (attendee) => attendee.user.toString() !== req.user.id
    );
    event.currentAttendees -= 1;
    await event.save();

    // Remove event from user's registered events
    user.registeredEvents = user.registeredEvents.filter(
      (registeredEvent) => registeredEvent.event.toString() !== event.id
    );
    await user.save();

    res.json({
      msg: "Unregistered from event successfully",
      eventId: event.id,
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Event not found" });
    }
    res.status(500).send("Server Error");
  }
};
