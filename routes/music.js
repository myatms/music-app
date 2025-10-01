const express = require('express');
const axios = require('axios');
const Music = require('../models/Music');
const router = express.Router();
const { trace } = require('@opentelemetry/api');

// Get tracer
const tracer = trace.getTracer('music-router');

// Search music and get YouTube link
router.get('/search', async (req, res) => {
  const span = tracer.startSpan('search-music');
  
  try {
    const { query } = req.query;
    
    if (!query) {
      span.setAttribute('error', true);
      span.setAttribute('error.message', 'Query parameter is required');
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    span.setAttribute('search.query', query);
    console.log(`Searching for music: ${query}`);

    // Search in database first
    const dbResults = await Music.searchByName(query);
    span.addEvent('database-search-completed', { results: dbResults.length });

    if (dbResults.length > 0) {
      span.addEvent('results-from-database');
      return res.json({ source: 'database', results: dbResults });
    }

    // If not found in database, search YouTube
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      throw new Error('YouTube API key not configured');
    }

    const youtubeResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          q: `${query} music`,
          type: 'video',
          maxResults: 10,
          key: youtubeApiKey
        }
      }
    );

    const youtubeResults = youtubeResponse.data.items.map(item => ({
      name: item.snippet.title,
      artist: item.snippet.channelTitle,
      youtube_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      youtube_video_id: item.id.videoId,
      thumbnail: item.snippet.thumbnails.default.url,
      description: item.snippet.description
    }));

    span.addEvent('youtube-search-completed', { results: youtubeResults.length });
    res.json({ source: 'youtube', results: youtubeResults });

  } catch (error) {
    console.error('Search error:', error);
    span.setAttribute('error', true);
    span.setAttribute('error.message', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  } finally {
    span.end();
  }
});

// Save music to database
router.post('/save', async (req, res) => {
  const span = tracer.startSpan('save-music');
  
  try {
    const { name, artist, album, youtube_url, youtube_video_id } = req.body;
    
    span.setAttributes({
      'music.name': name,
      'music.artist': artist,
      'music.album': album
    });

    if (!name) {
      span.setAttribute('error', true);
      span.setAttribute('error.message', 'Name is required');
      return res.status(400).json({ error: 'Name is required' });
    }

    console.log(`Saving music: ${name} by ${artist}`);

    const musicId = await Music.create({
      name,
      artist: artist || 'Unknown',
      album: album || 'Unknown',
      youtube_url,
      youtube_video_id
    });

    span.addEvent('music-saved', { musicId });
    res.json({ success: true, id: musicId, message: 'Music saved successfully' });

  } catch (error) {
    console.error('Save error:', error);
    span.setAttribute('error', true);
    span.setAttribute('error.message', error.message);
    res.status(500).json({ error: 'Save failed', details: error.message });
  } finally {
    span.end();
  }
});

// Get all saved music
router.get('/saved', async (req, res) => {
  const span = tracer.startSpan('get-saved-music');
  
  try {
    console.log('Fetching all saved music');
    const music = await Music.findAll();
    
    span.setAttribute('music.count', music.length);
    res.json(music);

  } catch (error) {
    console.error('Fetch error:', error);
    span.setAttribute('error', true);
    span.setAttribute('error.message', error.message);
    res.status(500).json({ error: 'Fetch failed', details: error.message });
  } finally {
    span.end();
  }
});

// Delete music
router.delete('/:id', async (req, res) => {
  const span = tracer.startSpan('delete-music');
  
  try {
    const { id } = req.params;
    span.setAttribute('music.id', id);

    console.log(`Deleting music with ID: ${id}`);
    const deleted = await Music.delete(id);

    if (!deleted) {
      span.setAttribute('error', true);
      span.setAttribute('error.message', 'Music not found');
      return res.status(404).json({ error: 'Music not found' });
    }

    span.addEvent('music-deleted');
    res.json({ success: true, message: 'Music deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    span.setAttribute('error', true);
    span.setAttribute('error.message', error.message);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  } finally {
    span.end();
  }
});

module.exports = router;