require('dotenv').config();
require('./opentelemetry'); // Initialize OpenTelemetry

const express = require('express');
const path = require('path');
const { initializeDatabase, testConnection } = require('./config/database');
const musicRoutes = require('./routes/music');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/api/music', musicRoutes);

// Render main page
app.get('/', (req, res) => {
  res.render('index');
});

// Render music management page
app.get('/music', (req, res) => {
  res.render('music');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealthy = await testConnection();
  res.json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Improved server startup with database readiness check
const startServer = async () => {
  try {
    console.log('🚀 Starting Music Book application...');
    
    // Initialize database with retry logic
    await initializeDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🎵 Music Book app running on http://localhost:${PORT}`);
      console.log('📊 OpenTelemetry tracing enabled');
      console.log('✅ Application ready!');
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', error.message);
    console.log('🔄 Application will start but database operations may fail');
    
    // Start server anyway but warn about database issues
    app.listen(PORT, () => {
      console.log(`🎵 Music Book app running on http://localhost:${PORT}`);
      console.log('❌ Database connection failed - some features may not work');
      console.log('📊 OpenTelemetry tracing enabled');
    });
  }
};

startServer();

module.exports = app;