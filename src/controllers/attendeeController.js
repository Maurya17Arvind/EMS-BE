const Attendee = require("../models/Attendee");
const Event = require("../models/Event");

// GET all attendees with powerful filtering and searching
exports.getAttendees = async (req, res) => {
  try {
    const query = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
      ];
    }
    if (req.query.status && req.query.status !== "all")
      query.status = req.query.status;
    if (req.query.ticketType && req.query.ticketType !== "all")
      query.ticketType = req.query.ticketType;
    if (req.query.eventId && req.query.eventId !== "all")
      query.event = req.query.eventId;

    // Populate event details to get the event name
    const attendees = await Attendee.find(query)
      .populate("event", "title")
      .sort({ registrationDate: -1 });
    res.json(attendees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// POST: Create a new attendee (manual admin entry)
exports.createAttendee = async (req, res) => {
  try {
    const newAttendee = new Attendee(req.body);
    await newAttendee.save();
    // Also increment the attendee count on the parent event
    await Event.findByIdAndUpdate(req.body.event, {
      $inc: { currentAttendees: 1 },
    });
    res.status(201).json(newAttendee);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// PUT: Update an attendee's details
exports.updateAttendee = async (req, res) => {
  try {
    const attendee = await Attendee.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!attendee) return res.status(404).json({ msg: "Attendee not found" });
    res.json(attendee);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// DELETE: Remove an attendee
exports.deleteAttendee = async (req, res) => {
  try {
    const attendee = await Attendee.findById(req.params.id);
    if (!attendee) return res.status(404).json({ msg: "Attendee not found" });

    // Decrement attendee count on the event before deleting
    await Event.findByIdAndUpdate(attendee.event, {
      $inc: { currentAttendees: -1 },
    });
    await Attendee.findByIdAndDelete(req.params.id);

    res.json({ msg: "Attendee removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// POST: Bulk delete attendees
exports.bulkDeleteAttendees = async (req, res) => {
  const { ids } = req.body;
  try {
    const attendeesToDelete = await Attendee.find({ _id: { $in: ids } });
    // Decrement counts on all relevant events
    for (const attendee of attendeesToDelete) {
      await Event.findByIdAndUpdate(attendee.event, {
        $inc: { currentAttendees: -1 },
      });
    }
    await Attendee.deleteMany({ _id: { $in: ids } });
    res.json({ msg: "Attendees removed successfully." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// PATCH: Check-in an attendee
exports.checkInAttendee = async (req, res) => {
  try {
    const attendee = await Attendee.findByIdAndUpdate(
      req.params.id,
      { status: "checked-in" },
      { new: true }
    );
    if (!attendee) return res.status(404).json({ msg: "Attendee not found" });
    res.json(attendee);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
