const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

// Load environment variables from .env file
dotenv.config();

const search = require('./api/search');
const metadata = require('./api/metadata');
const stream = require('./api/stream');
const playlist = require('./api/playlist');

const app = express();

// Simple CORS setup for Vercel serverless
app.use(cors({
  origin: [
    'https://web-music-player-01.netlify.app', 
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173'
  ],
  credentials: true
}));

// Mount API routes
app.get('/api/search', search);
app.get('/api/metadata', metadata);
app.get('/api/stream', stream);
app.get('/api/playlist', playlist);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend is running!',
    timestamp: new Date().toISOString(),
    env: {
      hasYoutubeKey: !!process.env.YOUTUBE_API_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
}); 