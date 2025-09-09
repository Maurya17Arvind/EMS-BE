const User = require("../models/User");
const Event = require("../models/Event"); // We need the Event model here

// @desc    Get current user's profile
exports.getProfile = async (req, res) => {
  try {
    // req.user.id is available from the auth middleware
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Update user profile
exports.updateProfile = async (req, res) => {
  const { firstName, lastName, email, phone, location, bio } = req.body;

  // Build profile object
  const profileFields = { firstName, lastName, email, phone, location, bio };

  try {
    let user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true } // Return the modified document
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// GET all events a user is registered for
exports.getMyRegisteredEvents = async (req, res) => {
  try {
    // Find the current user and populate the 'registeredEvents.event' path.
    // This tells Mongoose to not just give us the event ID, but to follow that ID
    // and fetch the entire event document from the 'events' collection.
    const user = await User.findById(req.user.id).populate(
      "registeredEvents.event"
    );

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // The user object now contains a `registeredEvents` array where each
    // element's `event` property is the full event object.
    // We just need to extract those event objects into a simple array.
    const registeredEvents = user.registeredEvents.map((reg) => reg.event);

    res.json(registeredEvents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.getUserDashboardStats = async (req, res) => {
  try {
    // 1. Fetch the current user and their registered events
    const user = await User.findById(req.user.id).populate({
      path: "registeredEvents.event",
      model: "event", // Explicitly specify the model
    });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const registeredEvents = user.registeredEvents.map((reg) => reg.event);

    // 2. Fetch general upcoming public events
    // Find the 3 nearest upcoming events that are published
    const upcomingPublicEvents = await Event.find({
      status: "published",
      date: { $gte: new Date() }, // Find events with a date greater than or equal to now
    })
      .sort({ date: 1 }) // Sort by the nearest date first
      .limit(3);

    // 3. Calculate Stats
    const totalRegistered = registeredEvents.length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Placeholder for new events this month. A more complex query could be used for exactness.
    const newEventsThisMonth = await Event.countDocuments({
      status: "published",
      createdAt: { $gte: startOfMonth },
    });

    // Find the very next upcoming registered event for the user
    const nextRegisteredEvent = registeredEvents
      .filter((event) => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0]; // Get the one with the soonest date

    // 4. Assemble the response payload
    res.json({
      upcomingPublicEvents, // For the "Upcoming Events" section
      registeredEvents, // For the "My Registered Events" section
      stats: {
        totalRegistered,
        upcomingRegistered: registeredEvents.filter(
          (event) => new Date(event.date) >= now
        ).length,
        newEventsThisMonth,
        nextEventDate: nextRegisteredEvent ? nextRegisteredEvent.date : null,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
