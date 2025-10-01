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
  const startTime = Date.now();
  
  try {
    const { query } = req.query;
    
    if (!query) {
      console.warn('⚠️ Search attempted without query parameter');
      span.setAttribute('error', true);
      span.setAttribute('error.message', 'Query parameter is required');
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    span.setAttribute('search.query', query);
    
    console.log(`🔍 Starting search operation:`, {
      query: query,
      timestamp: new Date().toISOString(),
      source: 'YouTube API'
    });

    // Search in database first
    console.log(`📊 Checking database for existing music matching: "${query}"`);
    const dbResults = await Music.searchByName(query);
    
    console.log(`📋 Database search results:`, {
      query: query,
      resultsCount: dbResults.length,
      results: dbResults.map(r => ({ id: r.id, name: r.name, artist: r.artist }))
    });

    span.addEvent('database-search-completed', { results: dbResults.length });

    if (dbResults.length > 0) {
      console.log(`✅ Returning ${dbResults.length} results from database for: "${query}"`);
      span.addEvent('results-from-database');
      return res.json({ source: 'database', results: dbResults });
    }

    console.log(`🌐 No database results found, searching YouTube API for: "${query}"`);

    // If not found in database, search YouTube
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      const errorMsg = 'YouTube API key not configured';
      console.error('❌ YouTube API configuration error:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`🎬 Making YouTube API request for: "${query}"`);
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

    console.log(`✅ YouTube API search completed:`, {
      query: query,
      resultsCount: youtubeResults.length,
      videos: youtubeResults.map(r => ({ 
        title: r.name, 
        artist: r.artist, 
        videoId: r.youtube_video_id 
      }))
    });

    span.addEvent('youtube-search-completed', { results: youtubeResults.length });
    res.json({ source: 'youtube', results: youtubeResults });

  } catch (error) {
    const errorDetails = {
      query: req.query.query,
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    };
    
    console.error('❌ Search operation failed:', errorDetails);
    span.setAttribute('error', true);
    span.setAttribute('error.message', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  } finally {
    const duration = Date.now() - startTime;
    console.log(`⏱️ Search operation completed in ${duration}ms`);
    span.end();
  }
});

// Save music to database
router.post('/save', async (req, res) => {
  const span = tracer.startSpan('save-music');
  const startTime = Date.now();
  
  try {
    const { name, artist, album, youtube_url, youtube_video_id } = req.body;
    
    console.log(`💾 Starting save operation:`, {
      musicData: { name, artist, album, youtube_video_id },
      timestamp: new Date().toISOString()
    });

    span.setAttributes({
      'music.name': name,
      'music.artist': artist,
      'music.album': album
    });

    if (!name) {
      console.warn('⚠️ Save attempted without name');
      span.setAttribute('error', true);
      span.setAttribute('error.message', 'Name is required');
      return res.status(400).json({ error: 'Name is required' });
    }

    console.log(`🎵 Saving music to database: "${name}" by ${artist || 'Unknown Artist'}`);

    const musicId = await Music.create({
      name,
      artist: artist || 'Unknown',
      album: album || 'Unknown',
      youtube_url,
      youtube_video_id
    });

    console.log(`✅ Music saved successfully:`, {
      id: musicId,
      name: name,
      artist: artist || 'Unknown',
      album: album || 'Unknown',
      youtube_video_id: youtube_video_id
    });

    span.addEvent('music-saved', { musicId });
    res.json({ success: true, id: musicId, message: 'Music saved successfully' });

  } catch (error) {
    console.error('❌ Save operation failed:', {
      musicData: req.body,
      error: error.message,
      stack: error.stack,
      sql: error.sql
    });
    span.setAttribute('error', true);
    span.setAttribute('error.message', error.message);
    res.status(500).json({ error: 'Save failed', details: error.message });
  } finally {
    const duration = Date.now() - startTime;
    console.log(`⏱️ Save operation completed in ${duration}ms`);
    span.end();
  }
});

// Get all saved music
router.get('/saved', async (req, res) => {
  const span = tracer.startSpan('get-saved-music');
  const startTime = Date.now();
  
  try {
    console.log(`📂 Fetching all saved music from database`);
    const music = await Music.findAll();
    
    console.log(`✅ Retrieved ${music.length} saved tracks from database:`, {
      count: music.length,
      tracks: music.map(m => ({ id: m.id, name: m.name, artist: m.artist }))
    });

    span.setAttribute('music.count', music.length);
    res.json(music);

  } catch (error) {
    console.error('❌ Fetch saved music failed:', {
      error: error.message,
      stack: error.stack,
      sql: error.sql
    });
    span.setAttribute('error', true);
    span.setAttribute('error.message', error.message);
    res.status(500).json({ error: 'Fetch failed', details: error.message });
  } finally {
    const duration = Date.now() - startTime;
    console.log(`⏱️ Fetch saved music completed in ${duration}ms`);
    span.end();
  }
});

// Delete music
router.delete('/:id', async (req, res) => {
  const span = tracer.startSpan('delete-music');
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    span.setAttribute('music.id', id);

    console.log(`🗑️ Starting delete operation for music ID: ${id}`);

    const deleted = await Music.delete(id);

    if (!deleted) {
      console.warn(`⚠️ Delete failed - music not found with ID: ${id}`);
      span.setAttribute('error', true);
      span.setAttribute('error.message', 'Music not found');
      return res.status(404).json({ error: 'Music not found' });
    }

    console.log(`✅ Music deleted successfully:`, {
      id: id,
      timestamp: new Date().toISOString()
    });

    span.addEvent('music-deleted');
    res.json({ success: true, message: 'Music deleted successfully' });

  } catch (error) {
    console.error('❌ Delete operation failed:', {
      id: req.params.id,
      error: error.message,
      stack: error.stack,
      sql: error.sql
    });
    span.setAttribute('error', true);
    span.setAttribute('error.message', error.message);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  } finally {
    const duration = Date.now() - startTime;
    console.log(`⏱️ Delete operation completed in ${duration}ms`);
    span.end();
  }
});

module.exports = router;