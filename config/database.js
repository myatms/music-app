const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'music_user',
  password: process.env.DB_PASSWORD || 'music_password',
  database: process.env.DB_NAME || 'music_book',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Add connection event listeners
pool.on('connection', (connection) => {
  console.log('🗃️ New database connection established');
});

pool.on('acquire', (connection) => {
  console.log('🗃️ Database connection acquired');
});

pool.on('release', (connection) => {
  console.log('🗃️ Database connection released');
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    console.log('🗃️ Initializing database...');
    const connection = await pool.getConnection();
    
    // Create music table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS music (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        artist VARCHAR(255),
        album VARCHAR(255),
        youtube_url VARCHAR(500),
        youtube_video_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Database initialized successfully - music table ready');
    connection.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
};

const testConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT 1 as test');
    connection.release();
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', {
      message: error.message,
      code: error.code
    });
    return false;
  }
};

module.exports = { pool, initializeDatabase, testConnection };