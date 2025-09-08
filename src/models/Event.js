const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  // Core Details
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, default: 0 },
  image: { type: String }, // URL to an image for the event

  // Date & Time
  date: { type: Date, required: true }, // Start date and time
  endDate: { type: Date }, // Optional end date and time

  // Capacity & Attendees
  capacity: { type: Number, required: true },
  currentAttendees: { type: Number, default: 0 },
  attendees: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    },
  ],

  // Admin & System Fields
  user: {
    // The admin who created the event
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "published", "ongoing", "completed", "cancelled"],
    default: "draft",
  },
  createdAt: {
    // When the event was created in the system
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("event", EventSchema);
