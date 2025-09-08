// server.js
const express = require("express");
const connectDB = require("./src/config/db");
require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:8080",
    credentials: true,
  })
);

// Connect to Database
connectDB();

// Init Middleware
app.use(express.json());
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/profile", require("./src/routes/profile"));
app.use("/api/events", require("./src/routes/events"));
app.use("/api/attendees", require("./src/routes/attendees"));
app.use("/api/dashboard", require("./src/routes/dashboard"));

app.get("/", (req, res) => {
  res.send("Welcome to the Event Management System API");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
