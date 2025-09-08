const mongoose = require("mongoose");

const AttendeeSchema = new mongoose.Schema({
  // Link to the event they are attending
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "event",
    required: true,
  },
  // Optional link to a user account if they registered themselves
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },

  // Attendee Information
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  company: { type: String },
  jobTitle: { type: String },

  // Registration Details
  ticketType: {
    type: String,
    enum: ["VIP", "Regular", "Student", "Staff"],
    required: true,
  },
  status: {
    type: String,
    enum: ["confirmed", "pending", "cancelled", "checked-in"],
    default: "pending",
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },

  // Additional Info
  dietary: { type: String },
  notes: { type: String },
});

// To prevent a user from registering for the same event twice
AttendeeSchema.index({ event: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("attendee", AttendeeSchema);
