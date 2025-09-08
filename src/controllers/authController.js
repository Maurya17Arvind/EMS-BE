const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/email");

exports.signup = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Create a new user instance
    user = new User({
      firstName,
      lastName,
      email,
      password,
    });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save the user to the database
    await user.save();

    // Create and return a JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET, // You should use a secret from an environment variable
      { expiresIn: 3600 }, // Token expires in 1 hour
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Create and return a JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET, // You should use a secret from an environment variable
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    // 1. Find the user by email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res
        .status(404)
        .json({ msg: "User with this email does not exist." });
    }

    // 2. Generate a random reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // 3. Hash the token and save it to the user in the database
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set an expiration time (e.g., 10 minutes)
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // 4. Create the reset URL and send the email
    // This URL must point to your FRONTEND application
    const resetURL = `http://localhost:3000/reset-password/${resetToken}`;

    const message = `Forgot your password? Click the following link to reset it: ${resetURL}\n\nIf you did not request this, please ignore this email. This link is valid for 10 minutes.`;

    await sendEmail({
      email: user.email,
      subject: "Password Reset Token",
      message,
    });

    res
      .status(200)
      .json({ status: "success", message: "Token sent to email!" });
  } catch (err) {
    // Clear the token fields on error to be safe
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    }
    console.error(err.message);
    res
      .status(500)
      .send("An error occurred while sending the password reset email.");
  }
};
exports.resetPassword = async (req, res) => {
  try {
    // 1. Get user based on the token
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // Find the user by the hashed token and check if it's not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    // 2. If the token is invalid or expired
    if (!user) {
      return res.status(400).json({ msg: "Token is invalid or has expired." });
    }

    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords do not match." });
    }

    // 3. Set the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. Clear the reset token fields and save the user
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // 5. (Optional) Log the user in and send a new JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 2. CRITICAL: Check if the user has the 'admin' role
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ msg: "Access denied. Not an administrator." });
    }

    // 3. Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 4. Create and return a JWT
    const payload = {
      user: {
        id: user.id,
        role: user?.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "5h" }, // Admin sessions can be longer
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.createAdmin = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Basic validation
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  try {
    // 1. Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ msg: "An account with this email already exists" });
    }

    // 2. Create a new user instance with the 'admin' role
    user = new User({
      firstName,
      lastName,
      email,
      password,
      role: "admin", // The key difference!
    });

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    console.log(user,'user');
    
    // 4. Save the new admin to the database
    await user.save();

    // You can choose whether to return the new user's data or just a success message
    // For security, it's better not to return a token or sensitive info here.
    res.status(201).json({ msg: "Admin account created successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
