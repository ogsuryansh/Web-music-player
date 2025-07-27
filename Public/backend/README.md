# Music Player Backend

This is the backend API for the music player application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory with the following variables:

```env
# YouTube API Configuration
# Get your API key from: https://console.cloud.google.com/apis/credentials
YOUTUBE_API_KEY=your_youtube_api_key_here

# Spotify API Configuration  
# Get your credentials from: https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Server Configuration
PORT=5000
NODE_ENV=development
```

## API Keys Setup

### YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

### Spotify API Credentials
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy the Client ID and Client Secret to your `.env` file

## Running the Backend

```bash
npm start
```

The backend will run on `http://localhost:5000`

## API Endpoints

- `GET /api/search?q=<query>` - Search for songs
- `GET /api/metadata` - Get song metadata
- `GET /api/playlist` - Get playlist information
- `GET /api/test-youtube` - Test YouTube API connection
- `GET /api/test-spotify` - Test Spotify API connection

## Priority System

The search API uses a priority system:

1. **YouTube API First** - Direct song matching for best results
2. **Spotify API Fallback** - When YouTube fails, uses Spotify with YouTube search
3. **Mock Data** - When both APIs fail

This ensures that when you click on a song card, it plays the correct song instead of random fallback videos. 