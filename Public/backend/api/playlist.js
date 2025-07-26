const axios = require('axios');

module.exports = async (req, res) => {
  try {
    console.log('[DEBUG] Playlist API called with method:', req.method);
    
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
  console.log('[DEBUG] Playlist API - YOUTUBE_API_KEY exists:', !!YOUTUBE_API_KEY);
  
  if (!YOUTUBE_API_KEY) {
    console.log('[DEBUG] Playlist API - No API key found, returning mock data');
    // Return mock data for testing
    return res.status(200).json({
      playlistInfo: {
        title: 'Mock Playlist',
        description: 'Test playlist',
        thumbnail: 'https://via.placeholder.com/480x360',
        videoCount: 1
      },
      videos: [
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
    console.log('[DEBUG] Playlist API error:', error.message);
    console.log('[DEBUG] Error response status:', error.response?.status);
    console.log('[DEBUG] Error response data:', error.response?.data);
    
    // Check if it's a quota exceeded error
    if (error.response?.status === 403 && error.response?.data?.error?.message?.includes('quota')) {
      console.log('[DEBUG] Quota exceeded, returning mock playlist data');
      // Return mock playlist data when quota is exceeded
      return res.status(200).json({
        playlistInfo: {
          title: 'Mock Playlist (Quota Exceeded)',
          description: 'This is mock data because YouTube API quota was exceeded',
          thumbnail: 'https://via.placeholder.com/480x360',
          videoCount: 2
        },
        videos: [
          {
            id: { videoId: 'dQw4w9WgXcQ' },
            snippet: {
              title: 'Mock Playlist Song 1',
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
              title: 'Mock Playlist Song 2',
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
    
    res.status(500).json({ 
      error: 'Failed to fetch playlist', 
      details: error.message, 
      yt: error.response?.data 
    });
  } catch (outerError) {
    console.log('[DEBUG] Playlist API outer catch - unexpected error:', outerError.message);
    console.log('[DEBUG] Outer error stack:', outerError.stack);
    res.status(500).json({ 
      error: 'Unexpected server error', 
      details: outerError.message,
      stack: outerError.stack
    });
  }
}; 