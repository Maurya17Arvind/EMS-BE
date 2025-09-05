// src/controllers/eventController.js
const Event = require("../models/Event");
const User = require("../models/User");

// @route   GET api/events
// @desc    Get all events with filters, search, sort
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    let query = {};

    // Search
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { location: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Category filter
    if (req.query.category && req.query.category !== "all") {
      query.category = req.query.category;
    }

    let events = Event.find(query).populate("user", ["firstName", "lastName"]); // Populate user details if needed

    // Sorting
    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case "date":
          events = events.sort("date"); // Ascending by date
          break;
        case "price":
          events = events.sort("price"); // Ascending by price
          break;
        case "popularity":
          events = events.sort("-currentAttendees"); // Descending by popularity
          break;
        default:
          events = events.sort("date"); // Default sort
          break;
      }
    } else {
      events = events.sort("date"); // Default sort
    }

    const result = await events;
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @route   GET api/events/:id
// @desc    Get event by ID
// @access  Public
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("user", [
      "firstName",
      "lastName",
    ]);
    if (!event) {
      return res.status(404).json({ msg: "Event not found" });
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

// @route   POST api/events
// @desc    Create an event
// @access  Private
exports.createEvent = async (req, res) => {
  const { title, description, category, location, date, price, capacity } =
    req.body;

  try {
    const newEvent = new Event({
      user: req.user.id,
      title,
      description,
      category,
      location,
      date,
      price: price || 0,
      capacity,
      currentAttendees: 0,
      attendees: [],
    });

    const event = await newEvent.save();

    // Add event to the organizedEvents list of the user
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { organizedEvents: { event: event.id } } },
      { new: true }
    );

    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @route   PUT api/events/:id
// @desc    Update an event
// @access  Private (Owner only)
exports.updateEvent = async (req, res) => {
  const { title, description, category, location, date, price, capacity } =
    req.body;

  // Build event object
  const eventFields = {
    title,
    description,
    category,
    location,
    date,
    price,
    capacity,
  };

  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ msg: "Event not found" });
    }

    // Check if user owns the event
    if (event.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: eventFields },
      { new: true }
    );

    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Event not found" });
    }
    res.status(500).send("Server Error");
  }
};

// @route   DELETE api/events/:id
// @desc    Delete an event
// @access  Private (Owner only)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ msg: "Event not found" });
    }

    // Check user
    if (event.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    await event.remove(); // Mongoose 5.x, for 6.x+ use `await Event.findByIdAndRemove(req.params.id);`

    // Remove event from organizedEvents of the user
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { organizedEvents: { event: req.params.id } },
    });

    // Also remove this event from registeredEvents of all users who registered for it
    await User.updateMany(
      { "registeredEvents.event": req.params.id },
      { $pull: { registeredEvents: { event: req.params.id } } }
    );

    res.json({ msg: "Event removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Event not found" });
    }
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
