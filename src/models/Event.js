// src/models/Event.js
const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  user: {
    // The user who created the event
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  date: {
    // Date of the event
    type: Date,
    required: true,
  },
  price: {
    type: Number,
    default: 0, // Free events
  },
  capacity: {
    // Max number of attendees
    type: Number,
    required: true,
  },
  currentAttendees: {
    // Number of people currently registered
    type: Number,
    default: 0,
  },
  attendees: [
    // List of user IDs who registered
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    },
  ],
  createdAt: {
    // When the event was created in the system
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("event", EventSchema);
