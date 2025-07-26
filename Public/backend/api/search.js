const axios = require('axios');

module.exports = async (req, res) => {
  const { q } = req.query;
  console.log('[DEBUG] /api/search called with query:', q);
  if (!q) {
    console.log('[DEBUG] Missing search query');
    return res.status(400).json({ error: 'Missing search query' });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    console.log('[DEBUG] YouTube API key not set');
    return res.status(500).json({ error: 'YouTube API key not set' });
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
    console.log('[DEBUG] YouTube API response:', JSON.stringify(response.data, null, 2));
    res.status(200).json(response.data);
  } catch (error) {
    console.log('[DEBUG] YouTube search failed:', error.message, error.response?.data);
    res.status(500).json({ error: 'YouTube search failed', details: error.message, yt: error.response?.data });
  }
}; 