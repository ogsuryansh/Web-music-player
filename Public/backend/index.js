const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

// Load environment variables from .env file
dotenv.config();

const search = require('./api/search');
const metadata = require('./api/metadata');
const stream = require('./api/stream');

const app = express();

// CORS setup for Netlify and Vercel
const allowedOrigins = [
  'https://web-music-player-01.netlify.app',
  'http://localhost:3000',
];
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

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