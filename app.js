require('dotenv').config();
require('./opentelemetry'); // Initialize OpenTelemetry

const express = require('express');
const path = require('path');
const { initializeDatabase, testConnection } = require('./config/database');
const musicRoutes = require('./routes/music');

const app = express();
const PORT = process.env.PORT || 3000;

// Custom logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

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
  console.log('🎵 Rendering main page');
  res.render('index');
});

// Render music management page
app.get('/music', (req, res) => {
  console.log('🎵 Rendering music management page');
  res.render('music');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  console.log('🔍 Health check requested');
  const dbHealthy = await testConnection();
  const healthStatus = {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  console.log('❤️ Health status:', healthStatus);
  res.json(healthStatus);
});

// Response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    const timestamp = new Date().toISOString();
    console.log(`📤 [${timestamp}] ${req.method} ${req.url} → Status: ${res.statusCode}`, {
      statusCode: res.statusCode,
      contentLength: JSON.stringify(data)?.length || 0,
      response: res.statusCode >= 400 ? data : undefined // Log error responses
    });
    originalSend.apply(res, arguments);
  };
  next();
});

// Error handling middleware
app.use((error, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`💥 [${timestamp}] Unhandled error:`, {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });
  res.status(500).json({ error: 'Internal server error', details: error.message });
});

// Improved server startup with database readiness check
const startServer = async () => {
  try {
    console.log('🚀 Starting Music Book application...', {
      port: PORT,
      nodeEnv: process.env.NODE_ENV,
      dbHost: process.env.DB_HOST
    });
    
    // Initialize database with retry logic
    await initializeDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🎵 Music Book app running on http://localhost:${PORT}`);
      console.log('📊 OpenTelemetry tracing enabled');
      console.log('✅ Application ready!');
      console.log('📝 Detailed logging enabled for all operations');
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
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