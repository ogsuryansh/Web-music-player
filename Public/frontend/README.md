# Music Player

A modern, responsive music player built with React and YouTube API integration.

## Features

### 🎵 Core Features
- **Search & Play**: Search for any song on YouTube and play it instantly
- **Playlists**: Create and manage your own playlists
- **Favorites**: Save your favorite songs for quick access
- **Queue Management**: Add songs to queue and manage playback order
- **Recently Played**: Track your listening history
- **Mobile Responsive**: Works perfectly on all devices

### 🎯 New YouTube Playlist Feature
- **Import YouTube Playlists**: Create playlists from any YouTube playlist URL
- **Automatic Song Import**: All songs from the YouTube playlist are automatically added
- **Playlist Info**: Shows playlist title, description, and song count
- **Visual Indicators**: YouTube playlists are marked with a YouTube icon

## How to Use YouTube Playlist Feature

1. **Navigate to Playlists**: Click on the "Playlists" tab in the sidebar
2. **Click "From YouTube"**: Click the red "From YouTube" button
3. **Paste Playlist URL**: Enter any YouTube playlist URL in the format:
   - `https://www.youtube.com/playlist?list=PLxxxxxxxx`
   - `https://youtube.com/playlist?list=PLxxxxxxxx`
   - `https://www.youtube.com/watch?v=xxxxx&list=PLxxxxxxxx`
4. **Create Playlist**: Click "Create Playlist" and wait for the import to complete
5. **Enjoy**: Your new playlist will appear with all songs from the YouTube playlist!

## Supported YouTube Playlist URL Formats

- ✅ `https://www.youtube.com/playlist?list=PLxxxxxxxx`
- ✅ `https://youtube.com/playlist?list=PLxxxxxxxx`
- ✅ `https://www.youtube.com/watch?v=xxxxx&list=PLxxxxxxxx`
- ✅ `https://youtu.be/xxxxx?list=PLxxxxxxxx`

## Keyboard Shortcuts

- **Space**: Play/Pause
- **Arrow Left/Right**: Previous/Next track
- **F**: Toggle favorite
- **M**: Mute/Unmute
- **Arrow Up/Down**: Volume control

## Technologies Used

- **Frontend**: React, Vite, CSS3
- **Backend**: Node.js, Express
- **API**: YouTube Data API v3
- **Deployment**: Vercel (Backend), Netlify (Frontend)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```
3. Set up environment variables in backend:
   - `YOUTUBE_API_KEY`: Your YouTube Data API key
4. Run the development servers:
   ```bash
   # Frontend
   cd frontend && npm run dev
   
   # Backend
   cd backend && npm start
   ```

## API Endpoints

- `GET /api/search?q=query` - Search YouTube videos
- `GET /api/playlist?playlistUrl=url` - Fetch YouTube playlist data
- `GET /api/metadata?id=videoId` - Get video metadata
- `GET /api/stream?id=videoId` - Stream video audio

## Contributing

Feel free to submit issues and enhancement requests!
