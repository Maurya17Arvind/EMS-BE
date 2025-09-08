// src/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  phone: { type: String },
  location: { type: String },
  bio: { type: String },
  registeredEvents: [
    {
      event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'event',
      },
    },
  ],
  organizedEvents: [
    {
      event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'event',
      },
    },
  ],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
});

module.exports = mongoose.model("user", UserSchema);
