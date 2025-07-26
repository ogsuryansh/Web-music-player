const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const search = require('./api/search');
const metadata = require('./api/metadata');
const stream = require('./api/stream');

const app = express();

// Mount API routes
app.get('/api/search', search);
app.get('/api/metadata', metadata);
app.get('/api/stream', stream);

// Health check
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
}); 