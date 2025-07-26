import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './config';
import './App.css';

const navLinks = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'playlists', label: 'Playlists', icon: 'queue_music' },
  { id: 'favorite', label: 'Favorites', icon: 'favorite' },
  { id: 'queue', label: 'Queue', icon: 'queue' },
  { id: 'history', label: 'History', icon: 'history' }
];

function getPlaylistsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('playlists')) || [];
  } catch {
    return [];
  }
}

function savePlaylistsToStorage(playlists) {
  localStorage.setItem('playlists', JSON.stringify(playlists));
}

function getFavoritesFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('favorites')) || [];
  } catch {
    return [];
  }
}

function saveFavoritesToStorage(favorites) {
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

function getRecentlyPlayedFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('recentlyPlayed')) || [];
  } catch {
    return [];
  }
}

function saveRecentlyPlayedToStorage(recentlyPlayed) {
  localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
}

export default function App() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlists, setPlaylists] = useState(getPlaylistsFromStorage());
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [toast, setToast] = useState('');
  const [showYouTubePlaylistModal, setShowYouTubePlaylistModal] = useState(false);
  const [youtubePlaylistUrl, setYoutubePlaylistUrl] = useState('');
  const [youtubePlaylistLoading, setYoutubePlaylistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [favorites, setFavorites] = useState(getFavoritesFromStorage());
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const seekBarRef = useRef(null);
  const playerRef = useRef(null);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [recentlyPlayed, setRecentlyPlayed] = useState(getRecentlyPlayedFromStorage());
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'
  const [autoplay, setAutoplay] = useState(true);
  const [currentSongIndex, setCurrentSongIndex] = useState(-1);
  const [songQueue, setSongQueue] = useState([]);
  const [showQueue, setShowQueue] = useState(false);
  const queueRef = useRef([]);
  const currentIndexRef = useRef(-1);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  // Remove showWaveform state

  // Add mobile navbar state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false);

  // Define isFavorite first since it's used by other functions
  const isFavorite = (song) => {
    if (!song) return false;
    return favorites.some(f => f.id.videoId === song.id.videoId);
  };

  // useCallback hooks must be defined before any useEffect or function that uses them
  const togglePlayPause = useCallback(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  }, [isPlaying]);

  const toggleFavorite = useCallback((song) => {
    if (!song) return;
    if (isFavorite(song)) {
      setFavorites(favorites => favorites.filter(f => f.id.videoId !== song.id.videoId));
    } else {
      setFavorites(favorites => [...favorites, song]);
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1200);
    }
  }, [favorites, isFavorite]);

  // Move setPlayerVolume, formatTime, handleSeekMouseDown here
  const setPlayerVolume = (newVolume) => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(newVolume);
    }
    setVolume(newVolume);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekMouseDown = () => {
    const handleMouseMove = (e) => {
      if (!playerRef.current || !nowPlaying) return;
      const rect = seekBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
      const newTime = (percentage / 100) * duration;
      playerRef.current.seekTo(newTime);
      setCurrentTime(newTime);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Add mobile navbar component
  const MobileNavbar = () => (
    <nav className="mobile-navbar">
      <div className="mobile-nav-content">
        <button 
          className="hamburger-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="material-symbols-outlined">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
        <h1 className="mobile-title">Music Player</h1>
        <div className="mobile-spacer"></div>
      </div>
    </nav>
  );

  // Function to handle mobile menu closing with animation
  const handleMobileMenuClose = () => {
    setIsMobileMenuClosing(true);
    setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsMobileMenuClosing(false);
    }, 300); // Match the animation duration
  };

  // Initialize MediaSession API for mobile background playback
  const initializeMediaSession = useCallback(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: nowPlaying?.snippet?.title || 'Music Player',
        artist: nowPlaying?.snippet?.channelTitle || 'Unknown Artist',
        album: 'Music Player',
        artwork: nowPlaying?.snippet?.thumbnails?.high?.url ? [
          { src: nowPlaying.snippet.thumbnails.high.url, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });

      // Enhanced action handlers for lock screen controls
      navigator.mediaSession.setActionHandler('play', () => {
        if (playerRef.current) {
          playerRef.current.playVideo();
        }
        setIsPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (playerRef.current) {
          playerRef.current.pauseVideo();
        }
        setIsPlaying(false);
      });

      // Note: previoustrack and nexttrack handlers will be set up later

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && playerRef.current) {
          playerRef.current.seekTo(details.seekTime);
          setCurrentTime(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (playerRef.current) {
          const newTime = Math.max(0, currentTime - (details.seekOffset || 10));
          playerRef.current.seekTo(newTime);
          setCurrentTime(newTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (playerRef.current) {
          const newTime = Math.min(duration, currentTime + (details.seekOffset || 10));
          playerRef.current.seekTo(newTime);
          setCurrentTime(newTime);
        }
      });

      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [nowPlaying, isPlaying, currentTime, duration]);

  // YouTube Player API Integration
  const initializePlayer = useCallback(() => {
    if (playerRef.current) return; // Already initialized

    // Initialize MediaSession
    initializeMediaSession();

    playerRef.current = new window.YT.Player('youtube-player', {
      height: '0',
      width: '0',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        origin: window.location.origin,
        widget_referrer: window.location.origin,
        host: 'https://www.youtube.com'
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    });
  }, [initializeMediaSession]);

  const onPlayerReady = (event) => {
    event.target.setVolume(volume); // Set initial volume when player is ready
    
    // Set up MediaSession handlers after player is ready
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    }
  };

  // Update player state change to handle repeat and autoplay
  const onPlayerStateChange = (event) => {
    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        setIsPlaying(true);
        startTimeUpdate();
        // Update MediaSession state
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
          // Update position state for lock screen controls
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: currentTime
          });
        }
        break;
      case window.YT.PlayerState.PAUSED:
        setIsPlaying(false);
        // Update MediaSession state
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
          // Update position state for lock screen controls
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: 1,
            position: currentTime
          });
        }
        break;
      case window.YT.PlayerState.ENDED:
        setIsPlaying(false);
        setCurrentTime(0);
        // Update MediaSession state
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
        }
        
        // Handle repeat and autoplay
        if (repeatMode === 'one') {
          // Repeat current song
          if (nowPlaying && playerRef.current) {
            playerRef.current.seekTo(0);
            playerRef.current.playVideo();
          }
        } else if ((repeatMode === 'all' || autoplay) && queueRef.current.length > 0) {
          // Play next song or repeat queue
          const nextIndex = (currentIndexRef.current + 1) % queueRef.current.length;
          const nextSong = queueRef.current[nextIndex];
          
          if (nextSong) {
            setNowPlaying(nextSong);
            playVideo(nextSong.id.videoId);
            currentIndexRef.current = nextIndex;
            setCurrentSongIndex(nextIndex);
            addToRecentlyPlayed(nextSong);
            
            // Maintain playlist context if we're playing from a playlist
            if (currentPlaylist && nextIndex === 0) {
              // If we're at the end of the playlist and repeat is off, clear playlist context
              if (repeatMode === 'off') {
                setCurrentPlaylist(null);
              }
            }
          }
        }
        break;
      default:
        break;
    }
  };

  const onPlayerError = () => {
    setError('Error playing video');
  };

  const startTimeUpdate = () => {
    const updateTime = () => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        setCurrentTime(currentTime);
        setDuration(duration);
      }
    };
    
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  };

  const playVideo = (videoId) => {
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          if (nowPlaying) {
            toggleFavorite(nowPlaying);
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          // Toggle mute/unmute
          setPlayerVolume(volume === 0 ? 70 : 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setPlayerVolume(Math.min(100, volume + 10));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPlayerVolume(Math.max(0, volume - 10));
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying, currentTime, duration, volume, toggleFavorite, togglePlayPause]);

  // Initialize YouTube Player
  useEffect(() => {
    // Initialize YouTube Player when API is ready
    if (window.YT && window.YT.Player) {
      initializePlayer();
    } else {
      // Wait for YouTube API to load
      window.onYouTubeIframeAPIReady = initializePlayer;
    }
  }, [initializePlayer]);



  // Register Service Worker for background audio
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => {
          // Service Worker registered successfully
        })
        .catch(() => {
          // Service Worker registration failed
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.action === 'play') {
          if (playerRef.current) {
            playerRef.current.playVideo();
          }
        } else if (event.data.action === 'pause') {
          if (playerRef.current) {
            playerRef.current.pauseVideo();
          }
        }
      });
    }
  }, []);

  // Handle page visibility changes for background audio
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden (background) - ensure audio continues
        if (isPlaying && playerRef.current) {
          // Keep playing in background
        }
      } else {
        // Page is visible again - sync player state
        if (playerRef.current) {
          // App came to foreground
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  useEffect(() => {
    savePlaylistsToStorage(playlists);
  }, [playlists]);

  useEffect(() => {
    saveFavoritesToStorage(favorites);
  }, [favorites]);

  useEffect(() => {
    saveRecentlyPlayedToStorage(recentlyPlayed);
  }, [recentlyPlayed]);



  // Update volume when volume state changes
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  // Update MediaSession metadata when nowPlaying changes
  useEffect(() => {
    if ('mediaSession' in navigator && nowPlaying) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: nowPlaying.snippet?.title || 'Unknown Track',
        artist: nowPlaying.snippet?.channelTitle || 'Unknown Artist',
        album: 'Music Player',
        artwork: nowPlaying.snippet?.thumbnails?.high?.url ? [
          { src: nowPlaying.snippet.thumbnails.high.url, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });
    }
  }, [nowPlaying]);

  // Recently Played Songs Management
  const addToRecentlyPlayed = (song) => {
    if (!song) return;
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(s => s.id.videoId !== song.id.videoId);
      return [song, ...filtered].slice(0, 20); // Keep last 20 songs
    });
  };

  // Add functions for player controls
  const handlePrevious = () => {
    if (currentSongIndex > 0) {
      const prevSong = queueRef.current[currentSongIndex - 1];
      
      // If we're in a playlist context, maintain it
      if (currentPlaylist) {
        setNowPlaying(prevSong);
        playVideo(prevSong.id.videoId);
        addToRecentlyPlayed(prevSong);
        currentIndexRef.current = currentSongIndex - 1;
        setCurrentSongIndex(currentSongIndex - 1);
      } else {
        // Regular queue behavior
        handleSongClick(prevSong);
        setCurrentSongIndex(currentSongIndex - 1);
      }
    }
  };

  const handleNext = () => {
    if (currentSongIndex < queueRef.current.length - 1) {
      const nextSong = queueRef.current[currentSongIndex + 1];
      
      // If we're in a playlist context, maintain it
      if (currentPlaylist) {
        setNowPlaying(nextSong);
        playVideo(nextSong.id.videoId);
        addToRecentlyPlayed(nextSong);
        currentIndexRef.current = currentSongIndex + 1;
        setCurrentSongIndex(currentSongIndex + 1);
      } else {
        // Regular queue behavior
        handleSongClick(nextSong);
        setCurrentSongIndex(currentSongIndex + 1);
      }
    }
  };



  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const toggleAutoplay = () => {
    setAutoplay(prev => !prev);
  };

  // Function to play from a playlist
  const handlePlayFromPlaylist = (song, playlistName) => {
    const playlist = playlists.find(p => p.name === playlistName);
    if (!playlist) return;
    
    // Set current playlist context
    setCurrentPlaylist(playlistName);
    
    // Find the index of the clicked song in the playlist
    const songIndex = playlist.songs.findIndex(s => s.id.videoId === song.id.videoId);
    
    // Set the current song
    setNowPlaying(song);
    playVideo(song.id.videoId);
    addToRecentlyPlayed(song);
    
    // Update queue and index
    queueRef.current = playlist.songs;
    setSongQueue(playlist.songs);
    currentIndexRef.current = songIndex;
    setCurrentSongIndex(songIndex);
  };

  // Update handleSongClick to manage queue
  const handleSongClick = (song) => {
    setNowPlaying(song);
    playVideo(song.id.videoId);
    addToRecentlyPlayed(song);
    
    // Clear playlist context when playing individual songs
    setCurrentPlaylist(null);
    
    // Add to queue if not already there
    const existingIndex = queueRef.current.findIndex(s => s.id.videoId === song.id.videoId);
    if (existingIndex === -1) {
      // Add new song to queue
      const newQueue = [...queueRef.current, song];
      queueRef.current = newQueue;
      setSongQueue(newQueue);
      currentIndexRef.current = newQueue.length - 1;
      setCurrentSongIndex(newQueue.length - 1);
    } else {
      // Song already in queue, just update index
      currentIndexRef.current = existingIndex;
      setCurrentSongIndex(existingIndex);
    }
  };

  // Add function to remove song from queue
  const removeFromQueue = (index) => {
    const newQueue = queueRef.current.filter((_, i) => i !== index);
    queueRef.current = newQueue;
    setSongQueue(newQueue);
    
    // Adjust current index if needed
    if (currentIndexRef.current >= index && currentIndexRef.current > 0) {
      currentIndexRef.current--;
      setCurrentSongIndex(currentIndexRef.current);
    }
  };

  // Add function to add song to queue without playing
  const addToQueue = (song) => {
    const existingIndex = queueRef.current.findIndex(s => s.id.videoId === song.id.videoId);
    if (existingIndex === -1) {
      const newQueue = [...queueRef.current, song];
      queueRef.current = newQueue;
      setSongQueue(newQueue);
    }
  };

  // Add function to play entire queue
  const playQueue = () => {
    if (queueRef.current.length > 0) {
      const firstSong = queueRef.current[0];
      setNowPlaying(firstSong);
      playVideo(firstSong.id.videoId);
      currentIndexRef.current = 0;
      setCurrentSongIndex(0);
      addToRecentlyPlayed(firstSong);
    }
  };

  const defaultSuggestions = [
    'Arijit Singh',
    'Shreya Ghoshal',
    'Lofi Hindi',
    'Bollywood Hits',
    'Punjabi Songs',
    'Romantic',
    'Party',
    'Workout',
    'Chill',
    'Old Classics',
    'English Pop',
    'Trending Now'
  ];

  // Auto-playlist categories with direct songs
  const [autoPlaylistSongs, setAutoPlaylistSongs] = useState([]);
  
  const autoPlaylistCategories = [
    { name: 'Bollywood Hits', keywords: ['bollywood hits', 'arijit singh', 'shreya ghoshal', 'latest bollywood'] },
    { name: 'Lofi Music', keywords: ['lofi hindi', 'lofi bollywood', 'chill lofi', 'study lofi'] },
    { name: 'Punjabi Songs', keywords: ['punjabi songs', 'diljit dosanjh', 'guru randhawa', 'latest punjabi'] },
    { name: 'Romantic Songs', keywords: ['romantic songs', 'love songs', 'romantic bollywood', 'couple songs'] },
    { name: 'Party Music', keywords: ['party songs', 'dance music', 'club songs', 'upbeat bollywood'] },
    { name: 'Old Classics', keywords: ['old bollywood', 'classic songs', 'kishore kumar', 'lata mangeshkar'] },
    { name: 'Workout Music', keywords: ['workout songs', 'gym music', 'motivation songs', 'energy music'] },
    { name: 'Sleep Music', keywords: ['sleep music', 'calm songs', 'soothing music', 'bedtime songs'] }
  ];

  // Load auto-playlist songs on component mount and refresh
  useEffect(() => {
    const loadAutoPlaylistSongs = async () => {
      setLoading(true);
      const allSongs = [];
      
      try {
        // Get 2-3 songs from each category
        for (const category of autoPlaylistCategories) {
          try {
            const keyword = category.keywords[Math.floor(Math.random() * category.keywords.length)];
            console.log('[DEBUG] Loading songs for category:', category.name, 'with keyword:', keyword);
            
            const res = await axios.get(`${API_BASE_URL}/api/search`, { 
              params: { q: keyword }, 
              timeout: 15000 
            });
            
            console.log('[DEBUG] API response for', category.name, ':', res.status, res.data?.items?.length || 0);
            
            if (res.data.items && res.data.items.length > 0) {
              const songs = res.data.items.slice(0, 3).map(song => ({
                ...song,
                category: category.name
              }));
              allSongs.push(...songs);
            }
          } catch (categoryError) {
            console.error(`[DEBUG] Error loading category ${category.name}:`, categoryError);
            // Continue with other categories even if one fails
          }
        }
        
        if (allSongs.length === 0) {
          console.log('[DEBUG] No songs loaded, using fallback data');
          // Add some fallback songs if API fails completely
          allSongs.push({
            id: { videoId: 'dQw4w9WgXcQ' },
            snippet: {
              title: 'Fallback Song - Test',
              channelTitle: 'Test Channel',
              thumbnails: {
                default: { url: 'https://via.placeholder.com/120x90' },
                medium: { url: 'https://via.placeholder.com/320x180' },
                high: { url: 'https://via.placeholder.com/480x360' }
              }
            },
            category: 'Test'
          });
        }
        
        setAutoPlaylistSongs(allSongs);
      } catch (err) {
        console.error('Auto-playlist loading error:', err);
        setError('Failed to load songs');
        // Set fallback songs even on complete failure
        setAutoPlaylistSongs([{
          id: { videoId: 'dQw4w9WgXcQ' },
          snippet: {
            title: 'Error Fallback Song',
            channelTitle: 'Test Channel',
            thumbnails: {
              default: { url: 'https://via.placeholder.com/120x90' },
              medium: { url: 'https://via.placeholder.com/320x180' },
              high: { url: 'https://via.placeholder.com/480x360' }
            }
          },
          category: 'Error'
        }]);
      } finally {
        setLoading(false);
      }
    };
    
    loadAutoPlaylistSongs();
  }, []); // Empty dependency array means it runs once on mount

  // UI for History Tab
  const renderHistoryTab = () => (
    <div>
              <h1 style={{fontSize:'1.8rem'}}>Recently Played</h1>
      <div className="search-results">
        {recentlyPlayed.length === 0 && <div style={{color:'#bfc9d9'}}>No recently played songs yet.</div>}
        {recentlyPlayed.map(item => (
          <div
            key={item.id.videoId}
            className="search-result"
            onClick={() => handleSongClick(item)}
          >
            <img
              src={item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url}
              alt={item.snippet.title}
            />
            <div className="title">{item.snippet.title}</div>
            <div className="artist">{item.snippet.channelTitle}</div>
            <div className="duration">3:45</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Remove WaveformVisualizer component

  // Handle hash-based routing for /playlists, /favorite, /history, and /queue
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#/playlists') {
        setActiveTab('playlists');
        setSelectedPlaylist(null);
      } else if (window.location.hash === '#/favorite') {
        setActiveTab('favorite');
        setSelectedPlaylist(null);
      } else if (window.location.hash === '#/history') {
        setActiveTab('history');
        setSelectedPlaylist(null);
      } else if (window.location.hash === '#/queue') {
        setActiveTab('queue');
        setSelectedPlaylist(null);
      } else {
        setActiveTab('home');
        setSelectedPlaylist(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/search`, { params: { q: search }, timeout: 10000 });
      setResults(res.data.items || []);
    } catch (err) {
      setError(`Failed to fetch results: ${err.message}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    if (playlists.some(p => p.name === newPlaylistName.trim())) {
      setToast('Playlist already exists!');
      return;
    }
    const newList = [...playlists, { name: newPlaylistName.trim(), songs: [] }];
    setPlaylists(newList);
    setNewPlaylistName('');
    setToast('Playlist created!');
  };

  const handleCreateYouTubePlaylist = async () => {
    if (!youtubePlaylistUrl.trim()) return;
    
    setYoutubePlaylistLoading(true);
    setError('');
    
    try {
      const res = await axios.get(`${API_BASE_URL}/api/playlist`, { 
        params: { playlistUrl: youtubePlaylistUrl.trim() }, 
        timeout: 15000 
      });
      
      const { playlistInfo, videos } = res.data;
      
      // Check if playlist with this name already exists
      if (playlists.some(p => p.name === playlistInfo.title)) {
        setToast('A playlist with this name already exists!');
        return;
      }
      
      // Create new playlist with YouTube videos
      const newPlaylist = {
        name: playlistInfo.title,
        songs: videos,
        source: 'youtube',
        originalUrl: youtubePlaylistUrl.trim()
      };
      
      setPlaylists(prev => [...prev, newPlaylist]);
      setYoutubePlaylistUrl('');
      setShowYouTubePlaylistModal(false);
      setToast(`Playlist "${playlistInfo.title}" created with ${videos.length} songs!`);
      
    } catch (err) {
      console.error('YouTube playlist fetch error:', err);
      setError(`Failed to create playlist: ${err.response?.data?.error || err.message}`);
    } finally {
      setYoutubePlaylistLoading(false);
    }
  };

  const handleAddToPlaylist = (playlistName, song) => {
    setPlaylists(playlists => playlists.map(p =>
      p.name === playlistName && !p.songs.some(s => s.id.videoId === song.id.videoId)
        ? { ...p, songs: [...p.songs, song] }
        : p
    ));
    setShowAddModal(false);
    setToast('Song added to playlist!');
  };

  const handleRemoveFromPlaylist = (playlistName, videoId) => {
    setPlaylists(playlists => playlists.map(p =>
      p.name === playlistName
        ? { ...p, songs: p.songs.filter(s => s.id.videoId !== videoId) }
        : p
    ));
    setToast('Song removed from playlist!');
  };

  // UI for Playlists Tab
  const renderPlaylistsTab = () => (
    <div>
              <h1 style={{fontSize:'1.8rem'}}>Playlists</h1>
      <div style={{marginBottom: '1.5rem'}}>
        <input
          type="text"
          placeholder="New playlist..."
          value={newPlaylistName}
          onChange={e => setNewPlaylistName(e.target.value)}
          style={{width: '200px', padding: '0.5rem', borderRadius: 6, border: 'none', marginRight: '0.5rem'}}
        />
        <button style={{borderRadius: 6, padding: '0.5rem 1rem', background: '#5eead4', color: '#222', fontWeight: 600, border: 'none', cursor: 'pointer'}} onClick={handleCreatePlaylist}>
          + New Playlist
        </button>
        <button 
          style={{
            borderRadius: 6, 
            padding: '0.5rem 1rem', 
            background: '#ff6b6b', 
            color: '#fff', 
            fontWeight: 600, 
            border: 'none', 
            cursor: 'pointer',
            marginLeft: '0.5rem'
          }} 
          onClick={() => setShowYouTubePlaylistModal(true)}
        >
          + Add Playlist from YouTube 
        </button>
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: '1.5rem'}}>
        {playlists.length === 0 && <div style={{color:'#bfc9d9'}}>No playlists yet.</div>}
        {playlists.map(p => (
          <div key={p.name} style={{background:'#23243a', borderRadius:12, padding:'1.2rem 2rem', minWidth:220, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', position:'relative', overflow:'hidden'}}>
            {/* Playlist name at top left */}
            <div style={{fontWeight:600, fontSize:'0.95rem', color:'#fff', marginBottom:'0.5rem'}}>
              {p.name}
              {p.source === 'youtube' && (
                <span style={{fontSize:'0.7rem', color:'#ff6b6b', marginLeft:'0.5rem'}}>YouTube</span>
              )}
              {p.source === 'auto-generated' && (
                <span style={{fontSize:'0.7rem', color:'#667eea', marginLeft:'0.5rem'}}>Auto</span>
              )}
            </div>
            
            {/* Action buttons */}
            <div style={{position:'absolute', top:12, right:16, display:'flex', gap:'0.5rem', zIndex:2}}>
              <button title="Edit Playlist" style={{background:'#23243a', border:'none', color:'#bfc9d9', cursor:'pointer', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.10)', transition:'background 0.2s'}} onClick={e => {e.stopPropagation(); setEditingPlaylist(p.name); setEditPlaylistName(p.name);}}>
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button title="Delete Playlist" style={{background:'#23243a', border:'none', color:'#ff6b6b', cursor:'pointer', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.10)', transition:'background 0.2s'}} onClick={e => {e.stopPropagation(); if(window.confirm('Delete this playlist?')) { setPlaylists(playlists.filter(pl => pl.name !== p.name)); setToast('Playlist deleted!'); if(selectedPlaylist === p.name) setSelectedPlaylist(null); }}}>
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
            {editingPlaylist === p.name ? (
              <form onSubmit={e => { e.preventDefault();
                if (!editPlaylistName.trim()) return;
                if (playlists.some(pl => pl.name === editPlaylistName.trim() && pl.name !== p.name)) {
                  setToast('Playlist name already exists!');
                  return;
                }
                setPlaylists(playlists.map(pl => pl.name === p.name ? { ...pl, name: editPlaylistName.trim() } : pl));
                setEditingPlaylist(null);
                setToast('Playlist renamed!');
              }} style={{display:'flex', alignItems:'center', gap:'0.5rem', marginTop:'2.5rem'}}>
                <input value={editPlaylistName} onChange={e => setEditPlaylistName(e.target.value)} autoFocus style={{padding:'0.3rem 0.7rem', borderRadius:6, border:'none', fontWeight:700, fontSize:'1.1rem'}} />
                <button type="submit" style={{background:'#5eead4', border:'none', borderRadius:6, padding:'0.3rem 0.7rem', color:'#23243a', fontWeight:700, cursor:'pointer'}}>Save</button>
                <button type="button" style={{background:'#bfc9d9', border:'none', borderRadius:6, padding:'0.3rem 0.7rem', color:'#23243a', fontWeight:700, cursor:'pointer'}} onClick={() => setEditingPlaylist(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <div style={{color:'#bfc9d9', fontSize:'0.85rem', marginTop:'0.5rem'}}>{p.songs.length} song{p.songs.length !== 1 ? 's' : ''}</div>
                <div onClick={() => setSelectedPlaylist(p.name)} style={{position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:1}} />
              </>
            )}
          </div>
        ))}
      </div>
      {selectedPlaylist && (
        <div style={{marginTop:'2.5rem'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
            <h2 style={{color:'#fff', fontWeight:600, fontSize:'1.3rem'}}>{selectedPlaylist}</h2>
            <button 
              style={{
                borderRadius: 6,
                padding: '0.5rem 1rem',
                background: '#5eead4',
                color: '#23243a',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onClick={() => {
                const playlist = playlists.find(p => p.name === selectedPlaylist);
                if (playlist && playlist.songs.length > 0) {
                  handlePlayFromPlaylist(playlist.songs[0], selectedPlaylist);
                }
              }}
            >
              <span className="material-symbols-outlined">play_circle</span>
              Play All
            </button>
          </div>
          <div className="search-results">
            {playlists.find(p => p.name === selectedPlaylist)?.songs.map(item => (
              <div
                key={item.id.videoId}
                className="search-result"
                onClick={() => handlePlayFromPlaylist(item, selectedPlaylist)}
                style={{position:'relative'}}
              >
                <button
                  title="Remove from Playlist"
                  style={{position:'absolute', top:12, right:16, background:'#23243a', border:'none', color:'#ff6b6b', cursor:'pointer', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.10)', transition:'background 0.2s', zIndex:2}}
                  onClick={e => { e.stopPropagation(); handleRemoveFromPlaylist(selectedPlaylist, item.id.videoId); }}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
                <img
                  src={item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url}
                  alt={item.snippet.title}
                />
                <div className="title">{item.snippet.title}</div>
                <div className="artist">{item.snippet.channelTitle}</div>
                <div className="duration">3:45</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // UI for Favorites Tab
  const renderFavoritesTab = () => (
    <div>
              <h1 style={{fontSize:'1.8rem'}}>Favorites</h1>
      <div className="search-results">
        {favorites.length === 0 && <div style={{color:'#bfc9d9'}}>No favorite songs yet.</div>}
        {favorites.map(item => (
          <div
            key={item.id.videoId}
            className="search-result"
            onClick={() => handleSongClick(item)}
          >
            <img
              src={item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url}
              alt={item.snippet.title}
            />
            <div className="title">{item.snippet.title}</div>
            <div className="artist">{item.snippet.channelTitle}</div>
            <div className="duration">3:45</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Add queue display section in the main content
  const renderQueueSection = () => (
    <div className="queue-section">
      <div className="section-header">
        <h2>Next in Queue</h2>
        <button 
          className="toggle-btn"
          onClick={() => setShowQueue(!showQueue)}
        >
          <span className="material-symbols-outlined">
            {showQueue ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>
      
      {showQueue && (
        <div className="queue-list">
          {songQueue.length === 0 ? (
            <div className="empty-queue">No songs in queue</div>
          ) : (
            songQueue.map((song, index) => (
              <div key={song.id.videoId} className="queue-item">
                <div className="queue-item-left">
                  <button 
                    className="heart-btn"
                    onClick={() => toggleFavorite(song)}
                  >
                    <span className="material-symbols-outlined">
                      {favorites.find(f => f.id.videoId === song.id.videoId) ? 'favorite' : 'favorite_border'}
                    </span>
                  </button>
                  <img
                    src={song.snippet.thumbnails.medium?.url || song.snippet.thumbnails.default.url}
                    alt={song.snippet.title}
                    className="queue-thumbnail"
                  />
                  <div className="queue-info">
                    <div className="queue-title">{song.snippet.title}</div>
                    <div className="queue-artist">{song.snippet.channelTitle}</div>
                  </div>
                </div>
                <div className="queue-item-right">
                  <div className="queue-duration">3:45</div>
                  <button 
                    className="remove-btn"
                    onClick={() => removeFromQueue(index)}
                    title="Remove from queue"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  // Add drag functionality for queue reordering
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newQueue = [...queueRef.current];
    const draggedItem = newQueue[draggedIndex];
    newQueue.splice(draggedIndex, 1);
    newQueue.splice(dropIndex, 0, draggedItem);
    
    queueRef.current = newQueue;
    setSongQueue(newQueue);
    
    // Update current index if needed
    if (currentIndexRef.current === draggedIndex) {
      currentIndexRef.current = dropIndex;
      setCurrentSongIndex(dropIndex);
    } else if (currentIndexRef.current > draggedIndex && currentIndexRef.current <= dropIndex) {
      currentIndexRef.current--;
      setCurrentSongIndex(currentIndexRef.current);
    } else if (currentIndexRef.current < draggedIndex && currentIndexRef.current >= dropIndex) {
      currentIndexRef.current++;
      setCurrentSongIndex(currentIndexRef.current);
    }
    
    setDraggedIndex(null);
  };

  // Add queue tab render function
  const renderQueueTab = () => (
    <div>
      <div className="queue-header">
        <h1 style={{fontSize:'1.8rem'}}>Queue</h1>
        {songQueue.length > 0 && (
          <button 
            className="play-queue-btn"
            onClick={playQueue}
            title="Play all songs in queue"
          >
            <span className="material-symbols-outlined">play_circle</span>
            <span className="btn-text">Queue</span>
          </button>
        )}
      </div>
      <div className="queue-container">
        {songQueue.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">queue_music</span>
            <h3>Your queue is empty</h3>
            <p>Search for songs and add them to your queue to see them here</p>
          </div>
        ) : (
          <div className="queue-list-full">
            {songQueue.map((song, index) => (
              <div
                key={song.id.videoId}
                className={`queue-item-full ${index === currentSongIndex ? 'playing' : ''} ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="queue-item-left">
                  <div className="drag-handle">
                    <span className="material-symbols-outlined">drag_indicator</span>
                  </div>
                  <button 
                    className="heart-btn"
                    onClick={() => toggleFavorite(song)}
                  >
                    <span className="material-symbols-outlined">
                      {favorites.find(f => f.id.videoId === song.id.videoId) ? 'favorite' : 'favorite_border'}
                    </span>
                  </button>
                  <img
                    src={song.snippet.thumbnails.medium?.url || song.snippet.thumbnails.default.url}
                    alt={song.snippet.title}
                    className="queue-thumbnail"
                  />
                  <div className="queue-info">
                    <div className="queue-title">{song.snippet.title}</div>
                    <div className="queue-artist">{song.snippet.channelTitle}</div>
                  </div>
                </div>
                <div className="queue-item-right">
                  <div className="queue-duration">3:45</div>
                  <button 
                    className="remove-btn"
                    onClick={() => removeFromQueue(index)}
                    title="Remove from queue"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Add a helper to detect mobile view
  const isMobile = window.innerWidth <= 480;

  // Update the main content area to include queue tab
  return (
    <div className="app-root">
      {/* Mobile Navbar */}
      <MobileNavbar />
      
      {/* Mobile Menu Overlay */}
      {(isMobileMenuOpen || isMobileMenuClosing) && (
        <div 
          className={`mobile-menu-overlay ${isMobileMenuClosing ? 'closing' : ''}`} 
          onClick={handleMobileMenuClose}
        >
          <div className={`mobile-menu ${isMobileMenuClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h2>Menu</h2>
              <button 
                className="close-menu-btn"
                onClick={handleMobileMenuClose}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="mobile-nav-links">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#/${link.id}`}
                  className={`mobile-nav-link ${activeTab === link.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(link.id);
                    setSelectedPlaylist(null);
                    handleMobileMenuClose();
                    window.location.hash = `#/${link.id}`;
                  }}
                >
                  <span className="material-symbols-outlined">{link.icon}</span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Music Player</h1>
        </div>
        <nav className="sidebar-nav">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#/${link.id}`}
              style={{color: activeTab === link.id ? '#fff' : '#bfc9d9', fontWeight: activeTab === link.id ? 700 : 500}}
              onClick={() => {
                setActiveTab(link.id);
                setSelectedPlaylist(null);
                window.location.hash = `#/${link.id}`;
              }}
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              {link.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'playlists' ? (
          renderPlaylistsTab()
        ) : activeTab === 'favorite' ? (
          renderFavoritesTab()
        ) : activeTab === 'history' ? (
          renderHistoryTab()
        ) : activeTab === 'queue' ? (
          renderQueueTab()
        ) : (
          <>
            <h1 style={{fontSize:'1.8rem'}}>Welcome to Your Music Player</h1>
            <form onSubmit={handleSearch} className="search-bar">
              <input
                type="text"
                placeholder="Search for songs, artists, or albums..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" disabled={loading}>
                <span className="material-symbols-outlined">search</span>
                Search
              </button>
            </form>
            {/* Default Search Suggestions - Only show when no results */}
            {results.length === 0 && (
              <div className="search-suggestions">
                {defaultSuggestions.map(s => (
                  <button
                    key={s}
                    className="search-suggestion-btn"
                    onClick={() => { setSearch(s); setTimeout(() => handleSearch({preventDefault:()=>{}}), 0); }}
                    disabled={loading}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Auto-Playlist Songs Section */}
            {results.length === 0 && autoPlaylistSongs.length > 0 && (
              <div style={{marginTop: '2rem'}}>
                <h2 style={{color: '#fff', fontSize: '1.4rem', marginBottom: '1rem'}}>
                  🎵 Trending Songs
                </h2>
                <div className="search-results">
                  {autoPlaylistSongs.map((song, index) => (
                    <div
                      key={`${song.id.videoId}-${index}`}
                      className="search-result"
                      onClick={() => handleSongClick(song)}
                      style={{position: 'relative'}}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600'
                      }}>
                        {song.category}
                      </div>
                      <img
                        src={song.snippet.thumbnails.medium?.url || song.snippet.thumbnails.default.url}
                        alt={song.snippet.title}
                      />
                      <div className="title">{song.snippet.title}</div>
                      <div className="artist">{song.snippet.channelTitle}</div>
                      <div className="duration">3:45</div>
                      <button 
                        className="add-to-queue-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(song);
                        }}
                        title="Add to queue"
                      >
                        <span className="material-symbols-outlined">queue_music</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {loading && <div className="loading">Searching for your favorite music...</div>}
            {error && <div className="error">{error}</div>}

            <div className="search-results">
              {results.map(item => (
                <div
                  key={item.id.videoId}
                  className="search-result"
                  onClick={() => handleSongClick(item)}
                >
                  <img
                    src={item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url}
                    alt={item.snippet.title}
                  />
                  <div className="title">{item.snippet.title}</div>
                  <div className="artist">{item.snippet.channelTitle}</div>
                  <div className="duration">3:45</div>
                  <button 
                    className="add-to-queue-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToQueue(item);
                    }}
                    title="Add to queue"
                  >
                    <span className="material-symbols-outlined">queue_music</span>
                  </button>
                </div>
              ))}
            </div>
            {songQueue.length > 0 && renderQueueSection()}
          </>
        )}
      </main>

      {/* Add to Playlist Modal (for player bar) */}
      {showAddModal && nowPlaying && (
        <div style={{position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.4)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={() => setShowAddModal(false)}>
          <div style={{background:'#23243a', padding:'2rem', borderRadius:12, minWidth:320, boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}} onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom:'1rem'}}>Add to Playlist</h3>
            {playlists.length === 0 && <div style={{color:'#bfc9d9', marginBottom:'1rem'}}>No playlists yet. Create one first!</div>}
            <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
              {playlists.map(p => (
                <button key={p.name} style={{border:'none', background:'#2563eb', color:'#fff', borderRadius:6, padding:'0.5rem', fontWeight:600, cursor:'pointer'}} onClick={() => handleAddToPlaylist(p.name, nowPlaying)}>
                  <span className="material-symbols-outlined" style={{verticalAlign:'middle'}}>playlist_add</span> {p.name}
                </button>
              ))}
            </div>
            <button style={{marginTop:'1.5rem', width:'100%', borderRadius:6, padding:'0.5rem', background:'#bfc9d9', color:'#23243a', fontWeight:600, border:'none', cursor:'pointer'}} onClick={() => setShowAddModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* YouTube Playlist Modal */}
      {showYouTubePlaylistModal && (
        <div style={{position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.4)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={() => setShowYouTubePlaylistModal(false)}>
          <div style={{background:'#23243a', padding:'2rem', borderRadius:12, minWidth:400, maxWidth:500, boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}} onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom:'1rem', color:'#fff'}}>
              <span className="material-symbols-outlined" style={{verticalAlign:'middle', marginRight:'0.5rem', color:'#ff6b6b'}}>youtube</span>
              Create Playlist from YouTube
            </h3>
            <p style={{color:'#bfc9d9', marginBottom:'1.5rem', fontSize:'0.9rem'}}>
              Paste a YouTube playlist URL to create a playlist with all the songs from that playlist.
            </p>
            <div style={{marginBottom:'1.5rem'}}>
              <input
                type="text"
                placeholder="https://www.youtube.com/playlist?list=..."
                value={youtubePlaylistUrl}
                onChange={e => setYoutubePlaylistUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: 6,
                  border: 'none',
                  background: '#1a1b2e',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
                disabled={youtubePlaylistLoading}
              />
            </div>
            {error && (
              <div style={{color:'#ff6b6b', marginBottom:'1rem', fontSize:'0.9rem'}}>
                {error}
              </div>
            )}
            <div style={{display:'flex', gap:'0.5rem', justifyContent:'flex-end'}}>
              <button 
                style={{
                  borderRadius: 6,
                  padding: '0.5rem 1rem',
                  background: '#bfc9d9',
                  color: '#23243a',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setShowYouTubePlaylistModal(false);
                  setYoutubePlaylistUrl('');
                  setError('');
                }}
                disabled={youtubePlaylistLoading}
              >
                Cancel
              </button>
              <button 
                style={{
                  borderRadius: 6,
                  padding: '0.5rem 1rem',
                  background: youtubePlaylistLoading ? '#666' : '#ff6b6b',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: youtubePlaylistLoading ? 'not-allowed' : 'pointer'
                }}
                onClick={handleCreateYouTubePlaylist}
                disabled={youtubePlaylistLoading || !youtubePlaylistUrl.trim()}
              >
                {youtubePlaylistLoading ? (
                  <>
                    <span className="material-symbols-outlined" style={{verticalAlign:'middle', marginRight:'0.3rem', animation:'spin 1s linear infinite'}}>sync</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{verticalAlign:'middle', marginRight:'0.3rem'}}>playlist_add</span>
                    Create Playlist
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{position:'fixed', bottom:40, left:'50%', transform:'translateX(-50%)', background:'#23243a', color:'#fff', padding:'1rem 2rem', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:200, fontWeight:600}}>
          {toast}
          {setTimeout(() => setToast(''), 2000) && null}
        </div>
      )}

      {/* Heart Animation Overlay */}
      {showHeartAnim && (
        <div className="heart-anim-overlay">
          <div className="heart-anim-bg" />
          <span className="material-symbols-outlined heart-anim-heart">favorite</span>
        </div>
      )}

      {/* Remove Waveform Visualizer */}

      {/* Player Bar - Update for mobile */}
      <footer className="player-bar">
        <div className="seek-bar-container">
          <div className="seek-bar-row">
            <span className="time-display">{formatTime(currentTime)}</span>
            <div className="seek-bar" ref={seekBarRef}>
              <div 
                className="seek-progress" 
                style={{width: `${(currentTime / duration) * 100}%`}}
              />
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime || 0}
                onChange={(e) => {
                  if (!playerRef.current || !nowPlaying) return;
                  const newTime = parseFloat(e.target.value);
                  playerRef.current.seekTo(newTime);
                  setCurrentTime(newTime);
                }}
                onMouseDown={handleSeekMouseDown}
                className="seek-input"
                style={{ pointerEvents: 'auto' }}
              />
            </div>
            <span className="time-display">{formatTime(duration)}</span>
          </div>
        </div>

        {isMobile ? (
          <div className="player-bar-mobile-inner">
            {/* Left: Circular thumbnail */}
            <div className="mobile-thumb">
              {nowPlaying && (
                                          <img
                            src={nowPlaying.snippet.thumbnails.medium?.url || nowPlaying.snippet.thumbnails.default.url}
                            alt={nowPlaying.snippet.title}
                            className={`mobile-now-playing-thumb ${isPlaying ? 'playing' : ''}`}
                          />
              )}
            </div>
            {/* Center: Main controls */}
            <div className="mobile-controls">
              <button className="control-btn" onClick={handlePrevious} disabled={currentSongIndex <= 0}>
                <span className="material-symbols-outlined">skip_previous</span>
              </button>
              <button className="play-btn" onClick={togglePlayPause}>
                <span className="material-symbols-outlined">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button className="control-btn" onClick={handleNext} disabled={currentSongIndex >= queueRef.current.length - 1}>
                <span className="material-symbols-outlined">skip_next</span>
              </button>
            </div>
            {/* Right: Heart icon */}
            <div className="mobile-heart">
              <button 
                className="favorite-btn"
                onClick={() => nowPlaying && toggleFavorite(nowPlaying)}
                style={{color: nowPlaying && favorites.find(f => f.id.videoId === nowPlaying.id.videoId) ? '#ff6b6b' : '#bfc9d9'}}
              >
                <span className="material-symbols-outlined">
                  {nowPlaying && favorites.find(f => f.id.videoId === nowPlaying.id.videoId) ? 'favorite' : 'favorite_border'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          // ... existing desktop player bar layout ...
          <div className="player-controls">
            {/* Song Info Section */}
            <div className="song-info-section">
              {nowPlaying && (
                <>
                                              <img
                              src={nowPlaying.snippet.thumbnails.medium?.url || nowPlaying.snippet.thumbnails.default.url}
                              alt={nowPlaying.snippet.title}
                              className={`now-playing-thumbnail ${isPlaying ? 'playing' : ''}`}
                            />
                  <div className="song-details">
                    <div className="song-title">{nowPlaying.snippet.title}</div>
                    <div className="song-artist">
                      {nowPlaying.snippet.channelTitle}
                      {currentPlaylist && (
                        <span style={{fontSize:'0.8rem', color:'#ff6b6b', marginLeft:'0.5rem'}}>
                          • From {currentPlaylist}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Playback Controls */}
            <div className="playback-controls">
              <button 
                className={`control-btn ${autoplay ? 'active' : ''}`} 
                title={autoplay ? 'Autoplay On' : 'Autoplay Off'}
                onClick={toggleAutoplay}
              >
                <span className="material-symbols-outlined">autoplay</span>
              </button>
              <button 
                className={`control-btn ${repeatMode !== 'off' ? 'active' : ''}`} 
                title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
                onClick={toggleRepeat}
              >
                <span className="material-symbols-outlined">
                  {repeatMode === 'one' ? 'repeat_one' : 'repeat'}
                </span>
              </button>
              <button className="control-btn" onClick={handlePrevious} disabled={currentSongIndex <= 0}>
                <span className="material-symbols-outlined">skip_previous</span>
              </button>
              <button className="play-btn" onClick={togglePlayPause}>
                <span className="material-symbols-outlined">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button className="control-btn" onClick={handleNext} disabled={currentSongIndex >= queueRef.current.length - 1}>
                <span className="material-symbols-outlined">skip_next</span>
              </button>
            </div>
            {/* Volume & Actions */}
            <div className="volume-section">
              <button 
                className="favorite-btn"
                onClick={() => nowPlaying && toggleFavorite(nowPlaying)}
                style={{color: nowPlaying && favorites.find(f => f.id.videoId === nowPlaying.id.videoId) ? '#ff6b6b' : '#bfc9d9'}}
              >
                <span className="material-symbols-outlined">
                  {nowPlaying && favorites.find(f => f.id.videoId === nowPlaying.id.videoId) ? 'favorite' : 'favorite_border'}
                </span>
              </button>
              <div className="volume-control">
                <span className="material-symbols-outlined">volume_up</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="volume-slider"
                />
              </div>
            </div>
          </div>
        )}
        {/* Hidden YouTube Player */}
        <div id="youtube-player" style={{ display: 'none' }} />
      </footer>
    </div>
  );
}
