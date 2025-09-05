// server.js
const express = require('express');
const connectDB = require('./src/config/db');
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors()); // This will allow all origins. For production, you should configure it more securely.

// Connect to Database
connectDB();

// Init Middleware
app.use(bodyParser.json());
app.use('/api/auth', require('./src/routes/auth'));


app.get('/', (req, res) => {
  res.send('Welcome to the Event Management System API');
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});