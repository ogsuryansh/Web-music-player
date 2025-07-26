module.exports = async (req, res) => {
  // Streaming via yt-dlp is not implemented for Vercel serverless yet
  res.status(501).json({ error: 'Audio streaming not implemented in serverless backend. Consider using a dedicated server for streaming.' });
}; 