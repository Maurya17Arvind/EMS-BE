const mongoose = require("mongoose");
const Event = require("../models/Event");
const User = require("../models/User");

/**
 * @route   GET /api/events
 * @desc    Get all events with role-based filtering, search, and sorting.
 * @access  Public (with content restriction), Private (for admins to see all)
 */
exports.getEvents = async (req, res) => {
  try {
    const query = {};
    let isAdmin = false;

    // Check if the user making the request is an authenticated admin
    if (req.user && req.user.id) {
      const user = await User.findById(req.user.id);
      if (user && user.role === "admin") {
        isAdmin = true;
      }
    }

    // --- CRITICAL SECURITY & LOGIC ---
    if (isAdmin) {
      // Admins can see everything and filter by any status
      if (req.query.status && req.query.status !== "all") {
        query.status = req.query.status;
      }
    } else {
      // Regular users or guests can ONLY see events with the 'published' status.
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

    // Sorting (applies to both)
    let sortOption = { createdAt: -1 }; // Default sort by most recently created
    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case "date":
          sortOption = { date: 1 };
          break; // Ascending by event date
        case "price":
          sortOption = { price: 1 };
          break; // Ascending by price
        case "popularity":
          sortOption = { currentAttendees: -1 };
          break; // Descending by popularity
      }
    }

    const events = await Event.find(query).sort(sortOption);
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   GET /api/events/:id
 * @desc    Get a single event by its ID for public viewing.
 * @access  Public
 */
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "user",
      "firstName lastName"
    );

    if (!event) {
      return res.status(404).json({ msg: "Event not found" });
    }

    // For a public-facing detail page, only show published events.
    if (event.status !== "published") {
      return res.status(404).json({ msg: "This event is not available." });
    }

    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Event not found" });
    }
    res.status(500).send("Server Error");
  }
};

/**
 * @route   POST /api/events
 * @desc    Create a new event.
 * @access  Private (Admin only)
 */
exports.createEvent = async (req, res) => {
  try {
    const newEvent = new Event({
      ...req.body,
      user: req.user.id, // Assign the event to the logged-in admin
    });
    const event = await newEvent.save();
    res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   PUT /api/events/:id
 * @desc    Update an existing event.
 * @access  Private (Admin only)
 */
exports.updateEvent = async (req, res) => {
  try {
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, // Find event by ID AND ensure ownership
      { $set: req.body },
      { new: true }
    );
    if (!updatedEvent)
      return res
        .status(404)
        .json({ msg: "Event not found or user not authorized" });
    res.json(updatedEvent);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete an event.
 * @access  Private (Admin only)
 */
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!event)
      return res
        .status(404)
        .json({ msg: "Event not found or user not authorized" });

    // Clean up: Remove this event from any user's registeredEvents list
    await User.updateMany(
      { "registeredEvents.event": req.params.id },
      { $pull: { registeredEvents: { event: req.params.id } } }
    );

    // Clean up: Also remove any attendees associated with this event
    await require("../models/Attendee").deleteMany({ event: req.params.id });

    res.json({ msg: "Event removed successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   POST /api/events/:id/duplicate
 * @desc    Create a copy of an event.
 * @access  Private (Admin only)
 */
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
    delete newEventData.__v;

    const duplicatedEvent = new Event(newEventData);
    await duplicatedEvent.save();
    res.status(201).json(duplicatedEvent);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   POST /api/events/:id/register
 * @desc    Register the logged-in user for an event.
 * @access  Private (User)
 */
exports.registerEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const user = await User.findById(req.user.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });
    if (event.status !== "published")
      return res
        .status(400)
        .json({ msg: "This event is not open for registration." });
    if (event.currentAttendees >= event.capacity)
      return res.status(400).json({ msg: "Event is full." });
    if (user.registeredEvents.some((reg) => reg.event.equals(event._id)))
      return res
        .status(400)
        .json({ msg: "You are already registered for this event." });

    // Update user and event atomically
    user.registeredEvents.push({ event: event._id });
    event.currentAttendees += 1;
    event.attendees.push({ user: user._id });

    await user.save();
    await event.save();

    res.json({ msg: "Registered for event successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   POST /api/events/:id/unregister
 * @desc    Unregister the logged-in user from an event.
 * @access  Private (User)
 */
exports.unregisterEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event not found" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { registeredEvents: { event: event._id } } },
      { new: true }
    );

    // Check if the user was actually registered
    const wasRegistered = event.attendees.some((att) =>
      att.user.equals(user._id)
    );
    if (!wasRegistered) {
      // If they weren't, we can add their registration back since the pull did nothing
      // Or just return a message
      return res
        .status(400)
        .json({ msg: "You were not registered for this event." });
    }

    event.currentAttendees = Math.max(0, event.currentAttendees - 1); // Prevent negative numbers
    event.attendees = event.attendees.filter(
      (att) => !att.user.equals(user._id)
    );

    await event.save();

    res.json({ msg: "Unregistered from event successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
