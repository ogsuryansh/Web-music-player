const axios = require('axios');

module.exports = async (req, res) => {
  try {
    console.log('[DEBUG] Search API called with method:', req.method);
    console.log('[DEBUG] Request headers:', req.headers);
    
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
  console.log('[DEBUG] YOUTUBE_API_KEY exists:', !!YOUTUBE_API_KEY);
  console.log('[DEBUG] Environment variables:', Object.keys(process.env).filter(key => key.includes('YOUTUBE')));
  
  if (!YOUTUBE_API_KEY) {
    console.log('[DEBUG] No API key found, returning mock data');
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
    console.log('[DEBUG] Making YouTube API request with query:', q);
    console.log('[DEBUG] API Key length:', YOUTUBE_API_KEY?.length);
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q,
        type: 'video',
        maxResults: 15,
        key: YOUTUBE_API_KEY,
      },
      timeout: 10000, // 10 second timeout
    });
    
    console.log('[DEBUG] YouTube API response status:', response.status);
    console.log('[DEBUG] Response data keys:', Object.keys(response.data || {}));
    
    if (!response.data || !response.data.items) {
      console.log('[DEBUG] Invalid response structure:', response.data);
      return res.status(500).json({ error: 'Invalid YouTube API response' });
    }
    
    res.status(200).json(response.data);
  } catch (error) {
    console.log('[DEBUG] YouTube API error:', error.message);
    console.log('[DEBUG] Error code:', error.code);
    console.log('[DEBUG] Error response status:', error.response?.status);
    console.log('[DEBUG] Error response data:', error.response?.data);
    
    // Check if it's a quota exceeded error
    if (error.response?.status === 403 && error.response?.data?.error?.message?.includes('quota')) {
      console.log('[DEBUG] Quota exceeded, returning mock data');
      // Return mock data when quota is exceeded
      return res.status(200).json({
        items: [
          {
            id: { videoId: 'dQw4w9WgXcQ' },
            snippet: {
              title: `Mock Song for "${q}"`,
              channelTitle: 'Test Channel',
              thumbnails: {
                default: { url: 'https://via.placeholder.com/120x90' },
                medium: { url: 'https://via.placeholder.com/320x180' },
                high: { url: 'https://via.placeholder.com/480x360' }
              }
            }
          },
          {
            id: { videoId: 'jNQXAC9IVRw' },
            snippet: {
              title: `Another Mock Song for "${q}"`,
              channelTitle: 'Test Channel 2',
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
    
    // Return more specific error information for other errors
    res.status(500).json({ 
      error: 'YouTube search failed', 
      details: error.message,
      code: error.code,
      status: error.response?.status,
      yt: error.response?.data 
    });
  }
}; 