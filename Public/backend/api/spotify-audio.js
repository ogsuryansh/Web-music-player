const axios = require('axios');

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Get Spotify access token
async function getSpotifyToken() {
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.log('[INFO] Spotify token error:', error.message);
    return null;
  }
}

// Get Spotify track details
async function getSpotifyTrack(trackId) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return null;
  }

  try {
    const token = await getSpotifyToken();
    if (!token) return null;

    const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.log('[INFO] Spotify track fetch failed:', error.message);
    return null;
  }
}

// Stream Spotify audio (proxy through our server)
async function streamSpotifyAudio(trackId, res) {
  try {
    const track = await getSpotifyTrack(trackId);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // For now, we'll return track info and let frontend handle playback
    // In a real implementation, you'd need Spotify Web Playback SDK or similar
    res.json({
      success: true,
      track: {
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => a.name),
        album: track.album.name,
        duration_ms: track.duration_ms,
        preview_url: track.preview_url,
        external_urls: track.external_urls,
        uri: track.uri
      },
      message: 'Use Spotify Web Playback SDK for full audio streaming'
    });

  } catch (error) {
    console.log('[ERROR] Spotify audio streaming failed:', error.message);
    res.status(500).json({ 
      error: 'Audio streaming failed', 
      details: error.message 
    });
  }
}

module.exports = async (req, res) => {
  try {
    // CORS headers
    const allowedOrigins = [
      'https://glassmusic.fun',
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

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const { trackId } = req.query;
    if (!trackId) {
      return res.status(400).json({ error: 'Missing track ID' });
    }

    // Stream Spotify audio
    await streamSpotifyAudio(trackId, res);

  } catch (error) {
    console.log('[ERROR] Unexpected server error:', error.message);
    res.status(500).json({ 
      error: 'Unexpected server error', 
      details: error.message
    });
  }
}; 