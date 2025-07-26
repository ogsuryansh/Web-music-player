const axios = require('axios');

module.exports = async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'YouTube API key not set' });
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY,
      },
    });
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'YouTube metadata fetch failed', details: error.message });
  }
}; 