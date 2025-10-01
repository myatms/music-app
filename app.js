require('dotenv').config();
require('./opentelemetry'); // Initialize OpenTelemetry

const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./config/database');
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

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Music Book app running on http://localhost:${PORT}`);
      console.log('OpenTelemetry tracing enabled');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;