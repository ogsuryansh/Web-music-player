// Configuration for backend API URL
const getApiBaseUrl = () => {
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    // Use localhost backend for development
    return 'http://localhost:5000';
  }
  
  // Use production backend for production
  return 'https://web-music-player-mu.vercel.app';
};

export const API_BASE_URL = getApiBaseUrl(); 