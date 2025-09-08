// src/middleware/admin.js
const User = require("../models/User");

module.exports = async function (req, res, next) {
  try {
    // req.user.id is attached by the preceding 'auth' middleware
    const user = await User.findById(req.user.id);

    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ msg: "Access denied. Administrator privileges required." });
    }

    // If the user is an admin, proceed to the next function (the controller)
    next();
  } catch (err) {
    console.error("Something went wrong with the admin middleware");
    res.status(500).send("Server Error");
  }
};
