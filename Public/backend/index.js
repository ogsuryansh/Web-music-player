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
    'https://glassmusic.fun',
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

// Test YouTube API endpoint
app.get('/api/test-youtube', async (req, res) => {
  const axios = require('axios');
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'No YouTube API key' });
  }
  
  try {
    console.log('[DEBUG] Testing YouTube API with key length:', YOUTUBE_API_KEY.length);
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: 'test',
        type: 'video',
        maxResults: 1,
        key: YOUTUBE_API_KEY,
      },
      timeout: 10000,
    });
    
    console.log('[DEBUG] Test API response status:', response.status);
    res.json({ 
      success: true, 
      status: response.status,
      itemsCount: response.data?.items?.length || 0
    });
  } catch (error) {
    console.log('[DEBUG] Test API error:', error.message);
    res.status(500).json({ 
      error: 'YouTube API test failed', 
      details: error.message,
      code: error.code,
      status: error.response?.status
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
}); 