const axios = require('axios');

module.exports = async (req, res) => {
  // Add CORS headers
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

  const { playlistUrl } = req.query;
  
  if (!playlistUrl) {
    return res.status(400).json({ error: 'Missing playlist URL' });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'YouTube API key not set' });
  }

  try {
    // Extract playlist ID from URL
    let playlistId = null;
    
    // Handle different URL formats
    if (playlistUrl.includes('playlist?list=')) {
      playlistId = playlistUrl.split('playlist?list=')[1].split('&')[0];
    } else if (playlistUrl.includes('watch?v=') && playlistUrl.includes('&list=')) {
      playlistId = playlistUrl.split('&list=')[1].split('&')[0];
    } else if (playlistUrl.includes('youtu.be/') && playlistUrl.includes('?list=')) {
      playlistId = playlistUrl.split('?list=')[1].split('&')[0];
    }

    if (!playlistId) {
      return res.status(400).json({ error: 'Invalid YouTube playlist URL' });
    }

    // First, get playlist details
    const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
      params: {
        part: 'snippet',
        id: playlistId,
        key: YOUTUBE_API_KEY,
      },
    });

    if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const playlistInfo = playlistResponse.data.items[0].snippet;

    // Get all videos from the playlist
    const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        part: 'snippet',
        playlistId: playlistId,
        maxResults: 50, // YouTube API limit
        key: YOUTUBE_API_KEY,
      },
    });

    // Transform the data to match our app's format
    const videos = videosResponse.data.items.map(item => ({
      id: {
        videoId: item.snippet.resourceId.videoId
      },
      snippet: {
        title: item.snippet.title,
        channelTitle: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
        thumbnails: item.snippet.thumbnails,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt
      }
    }));

    res.status(200).json({
      playlistInfo: {
        title: playlistInfo.title,
        description: playlistInfo.description,
        thumbnail: playlistInfo.thumbnails?.high?.url || playlistInfo.thumbnails?.medium?.url,
        videoCount: videos.length
      },
      videos: videos
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch playlist', 
      details: error.message, 
      yt: error.response?.data 
    });
  }
}; 