const axios = require('axios');

module.exports = async (req, res) => {
  // Add CORS headers as backup
  const allowedOrigins = [
    'https://web-music-player-01.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    // Return mock data for testing
    return res.status(200).json({
      items: [
        {
          id: { videoId: 'dQw4w9WgXcQ' },
          snippet: {
            title: 'Mock Song - Test',
            channelTitle: 'Test Channel',
            thumbnails: {
              default: { url: 'https://via.placeholder.com/120x90' },
              medium: { url: 'https://via.placeholder.com/320x180' },
              high: { url: 'https://via.placeholder.com/480x360' }
            }
          }
        }
      ]
    });
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q,
        type: 'video',
        maxResults: 15,
        key: YOUTUBE_API_KEY,
      },
    });
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'YouTube search failed', details: error.message, yt: error.response?.data });
  }
}; 