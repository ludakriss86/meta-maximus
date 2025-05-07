require('dotenv').config();
const express = require('express');
const app = express();

// Log the PORT environment variable
console.log(`PORT environment variable: ${process.env.PORT}`);

// Set port just like in the main server
const port = process.env.PORT || 3001;

// Create a simple handler
app.get('/', (req, res) => {
  res.send('Test server is running');
});

// Start the server
app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});